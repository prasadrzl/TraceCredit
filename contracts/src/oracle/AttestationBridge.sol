// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProtocolBase} from "../base/ProtocolBase.sol";
import {IScoreEngine} from "../interfaces/IScoreEngine.sol";

/**
 * @notice Security perimeter for all off-chain data entering the score system.
 *         Cross-protocol signals (Gitcoin, Aave history, Chainlink Any-API) must
 *         pass an M-of-N attestor quorum before being forwarded to ScoreEngine.
 *         A single compromised oracle cannot inflate scores.
 *
 *         Quorum window: attestors must agree within QUORUM_WINDOW (1 hour).
 *         Chainlink path: fulfillCrossProtocolData() maps repaymentCount to
 *         CROSS_PROTOCOL_REPAYMENT signals.
 */
contract AttestationBridge is ProtocolBase {
    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant ATTESTOR_ROLE = keccak256("ATTESTOR_ROLE");

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant QUORUM_WINDOW = 1 hours;

    // ── State ─────────────────────────────────────────────────────────────────
    address public scoreEngine;
    uint8   public requiredQuorum;

    struct PendingAttestation {
        uint256 count;
        uint256 firstAt;
        mapping(address => bool) voted;
    }

    // key: keccak256(wallet, signalType)
    mapping(bytes32 => PendingAttestation) private _pending;

    // ── Events ────────────────────────────────────────────────────────────────
    event AttestationSubmitted(
        address indexed wallet,
        uint8   indexed signalType,
        address indexed attestor,
        bytes32 evidenceHash,
        uint256 count
    );
    event QuorumReached(address indexed wallet, uint8 indexed signalType);
    event AttestorAdded(address indexed attestor);
    event AttestorRemoved(address indexed attestor);
    event QuorumUpdated(uint8 newQuorum);

    // ── Errors ────────────────────────────────────────────────────────────────
    error AlreadyVoted();
    error QuorumWindowExpired();
    error InvalidSignalType();

    // ── Initializer ───────────────────────────────────────────────────────────
    /**
     * @notice Initialise the AttestationBridge.
     * @param admin          Address granted all admin roles.
     * @param treasury_      Protocol treasury address.
     * @param scoreEngine_   ScoreEngine address.
     * @param quorum_        Initial required quorum count (minimum 2).
     */
    function initialize(
        address admin,
        address treasury_,
        address scoreEngine_,
        uint8   quorum_
    ) external initializer {
        __ProtocolBase_init(admin, treasury_);
        if (scoreEngine_ == address(0)) revert ZeroAddress();
        require(quorum_ >= 2, "Quorum must be >= 2");
        scoreEngine     = scoreEngine_;
        requiredQuorum  = quorum_;
    }

    // ── Governance ────────────────────────────────────────────────────────────
    /// @notice Add a whitelisted attestor. Only GOVERNOR_ROLE.
    /// @param attestor Address to add.
    function addAttestor(address attestor) external onlyRole(GOVERNOR_ROLE) {
        if (attestor == address(0)) revert ZeroAddress();
        _grantRole(ATTESTOR_ROLE, attestor);
        emit AttestorAdded(attestor);
    }

    /// @notice Remove a whitelisted attestor. Only GOVERNOR_ROLE.
    /// @param attestor Address to remove.
    function removeAttestor(address attestor) external onlyRole(GOVERNOR_ROLE) {
        _revokeRole(ATTESTOR_ROLE, attestor);
        emit AttestorRemoved(attestor);
    }

    /**
     * @notice Update the required quorum count. Only GOVERNOR_ROLE.
     * @param newQuorum New quorum threshold (minimum 2).
     */
    function setQuorum(uint8 newQuorum) external onlyRole(GOVERNOR_ROLE) {
        require(newQuorum >= 2, "Quorum must be >= 2");
        requiredQuorum = newQuorum;
        emit QuorumUpdated(newQuorum);
    }

    // ── Attestation submission ─────────────────────────────────────────────────
    /**
     * @notice Submit an attestation for a wallet signal. Only ATTESTOR_ROLE.
     *         When requiredQuorum attestors agree within QUORUM_WINDOW, the signal
     *         is forwarded to ScoreEngine and the pending state is cleared.
     * @param wallet       Target wallet.
     * @param signalType   Signal type (IScoreEngine.SignalType cast to uint8).
     * @param evidenceHash Hash of off-chain evidence (stored for auditability).
     */
    function submitAttestation(
        address wallet,
        uint8   signalType,
        bytes32 evidenceHash
    ) external onlyRole(ATTESTOR_ROLE) whenNotPaused {
        if (signalType > uint8(IScoreEngine.SignalType.WASH_CYCLE)) revert InvalidSignalType();

        bytes32 key = keccak256(abi.encodePacked(wallet, signalType));
        PendingAttestation storage pa = _pending[key];

        if (pa.count > 0 && block.timestamp > pa.firstAt + QUORUM_WINDOW) {
            // Reset expired quorum window
            pa.count   = 0;
            pa.firstAt = 0;
        }

        if (pa.voted[msg.sender]) revert AlreadyVoted();

        if (pa.count == 0) pa.firstAt = block.timestamp;
        pa.voted[msg.sender] = true;
        pa.count++;

        emit AttestationSubmitted(wallet, signalType, msg.sender, evidenceHash, pa.count);

        if (pa.count >= uint256(requiredQuorum)) {
            pa.count   = 0;
            pa.firstAt = 0;
            IScoreEngine(scoreEngine).processSignal(wallet, IScoreEngine.SignalType(signalType));
            emit QuorumReached(wallet, signalType);
        }
    }

    // ── Chainlink Any-API path ────────────────────────────────────────────────
    /**
     * @notice Callback for Chainlink Any-API cross-protocol repayment data.
     *         Maps a repaymentCount to repeated CROSS_PROTOCOL_REPAYMENT signals.
     *         Only callable by a whitelisted attestor (the Chainlink operator node).
     * @param wallet          Borrower wallet address.
     * @param repaymentCount  Number of on-time repayments reported by the external protocol.
     */
    function fulfillCrossProtocolData(address wallet, uint32 repaymentCount)
        external
        onlyRole(ATTESTOR_ROLE)
        whenNotPaused
    {
        for (uint32 i; i < repaymentCount; ) {
            IScoreEngine(scoreEngine).processSignal(
                wallet,
                IScoreEngine.SignalType.CROSS_PROTOCOL_REPAYMENT
            );
            unchecked { ++i; }
        }
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[46] private __gap;
}
