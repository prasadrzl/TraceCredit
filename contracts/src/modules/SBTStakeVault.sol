// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ProtocolBase} from "../base/ProtocolBase.sol";
import {ISBTStakeVault} from "../interfaces/ISBTStakeVault.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @notice Holds USDC stakes deposited by wallets minting an SBT.
 *         Separating stake logic from the ERC-5192 contract means:
 *         (1) slash logic can evolve without touching ERC-5192,
 *         (2) the DAO can change the stake amount via governance,
 *         (3) stakes can earn yield while locked in a future V2 feature.
 */
contract SBTStakeVault is ProtocolBase, ISBTStakeVault {
    using SafeERC20 for IERC20;

    // ── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant SBT_CONTRACT_ROLE = keccak256("SBT_CONTRACT_ROLE");

    // ── Constants ─────────────────────────────────────────────────────────────
    uint256 public constant UNLOCK_DELAY          = 30 days;
    uint256 public constant DEFAULT_STAKE_AMOUNT  = 50e6; // 50 USDC (6 decimals)

    // ── State ─────────────────────────────────────────────────────────────────
    IERC20  public usdc;
    uint256 public stakeAmount;

    mapping(address => StakeRecord) private _stakes;

    // ── Initializer ───────────────────────────────────────────────────────────
    /**
     * @notice Initialise the SBTStakeVault.
     * @param admin     Address granted all admin roles.
     * @param treasury_ Protocol treasury address.
     * @param usdc_     USDC token address.
     */
    function initialize(address admin, address treasury_, address usdc_) external initializer {
        __ProtocolBase_init(admin, treasury_);
        if (usdc_ == address(0)) revert ZeroAddress();
        usdc        = IERC20(usdc_);
        stakeAmount = DEFAULT_STAKE_AMOUNT;
    }

    // ── Governance ────────────────────────────────────────────────────────────
    /**
     * @notice Update the required stake amount. Only GOVERNOR_ROLE.
     *         Applies only to future mints; existing stakes are unaffected.
     * @param newAmount New stake amount in USDC (6 decimals).
     */
    function setStakeAmount(uint256 newAmount) external onlyRole(GOVERNOR_ROLE) {
        emit StakeAmountUpdated(stakeAmount, newAmount);
        stakeAmount = newAmount;
    }

    // ── ISBTStakeVault ────────────────────────────────────────────────────────
    /**
     * @notice Pull stakeAmount USDC from wallet and record the stake.
     *         Only SBT_CONTRACT_ROLE.
     * @param wallet Address to stake on behalf of.
     */
    function deposit(address wallet) external onlyRole(SBT_CONTRACT_ROLE) {
        uint256 amount = stakeAmount;
        usdc.safeTransferFrom(wallet, address(this), amount);
        _stakes[wallet] = StakeRecord({
            amount:      amount,
            depositedAt: uint40(block.timestamp),
            // forge-lint: disable-next-line(unsafe-typecast)
            // casting to uint40 is safe: block.timestamp + 30 days < uint40 max (year 36812)
            unlockAt:    uint40(block.timestamp + UNLOCK_DELAY)
        });
        emit StakeDeposited(wallet, amount);
    }

    /**
     * @notice Return the stake to wallet after the 30-day unlock delay.
     *         Only SBT_CONTRACT_ROLE.
     * @param wallet Address whose stake to release.
     */
    function release(address wallet) external onlyRole(SBT_CONTRACT_ROLE) {
        StakeRecord storage rec = _stakes[wallet];
        if (rec.amount == 0) revert NoStakeFound();
        if (block.timestamp < uint256(rec.unlockAt)) revert StillLocked(rec.unlockAt);

        uint256 amount = rec.amount;
        delete _stakes[wallet];
        usdc.safeTransfer(wallet, amount);
        emit StakeReleased(wallet, amount);
    }

    /**
     * @notice Slash a portion of the stake and send to a recipient. Only GUARDIAN_ROLE.
     * @param wallet    Address whose stake to slash.
     * @param amount    USDC amount to slash.
     * @param recipient Recipient of the slashed funds (e.g. ReserveModule).
     */
    function slash(address wallet, uint256 amount, address recipient)
        external
        onlyRole(GUARDIAN_ROLE)
    {
        StakeRecord storage rec = _stakes[wallet];
        if (rec.amount == 0) revert NoStakeFound();
        if (rec.amount < amount) revert InsufficientStakeBalance();

        unchecked { rec.amount -= amount; } // safe: checked above
        usdc.safeTransfer(recipient, amount);
        emit StakeSlashed(wallet, amount, recipient);
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    /// @notice Returns the stake record for a wallet.
    function stakes(address wallet) external view returns (StakeRecord memory) {
        return _stakes[wallet];
    }

    // ── Gap ───────────────────────────────────────────────────────────────────
    uint256[47] private __gap;
}
