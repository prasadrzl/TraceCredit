// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {
    ERC1967Proxy
} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import {SBTStakeVault} from "../src/modules/SBTStakeVault.sol";
import {ReputationSBT} from "../src/core/ReputationSBT.sol";
import {InterestAccrualEngine} from "../src/modules/InterestAccrualEngine.sol";
import {ScoreEngine} from "../src/core/ScoreEngine.sol";
import {ReserveModule} from "../src/core/ReserveModule.sol";
import {CreditLineManager} from "../src/modules/CreditLineManager.sol";
import {LendingPool} from "../src/core/LendingPool.sol";
import {FeeCollector} from "../src/modules/FeeCollector.sol";
import {LiquidationManager} from "../src/modules/LiquidationManager.sol";
import {WhitelistRegistry} from "../src/modules/WhitelistRegistry.sol";
import {RateLimiter} from "../src/modules/RateLimiter.sol";
import {EmergencyPause} from "../src/modules/EmergencyPause.sol";
import {ProtocolRegistry} from "../src/modules/ProtocolRegistry.sol";
import {AttestationBridge} from "../src/oracle/AttestationBridge.sol";

/**
 * @notice Full protocol deployment script for Optimism Sepolia (and other L2s).
 *
 *  Required env vars:
 *    DEPLOYER_PRIVATE_KEY   — deployer / admin EOA
 *    TREASURY_ADDRESS       — protocol treasury multisig
 *    USDC_ADDRESS           — USDC token on target chain
 *    KEEPER_ADDRESS         — off-chain liquidation keeper EOA
 *    ATTESTOR_ADDRESS       — initial M-of-N attestor EOA
 *    QUORUM                 — required attestor quorum (min 2)
 *
 */

//forge script script/Deploy.s.sol:Deploy --rpc-url $OP_SEPOLIA_RPC_URL --broadcast --verify --verifier etherscan --etherscan-api-key $OPSCAN_API_KEY -vvvv
contract Deploy is Script {
    // ── Deployed addresses (populated during run) ─────────────────────────────
    SBTStakeVault public stakeVault;
    ReputationSBT public sbt;
    InterestAccrualEngine public iae;
    ScoreEngine public scoreEngine;
    ReserveModule public reserve;
    CreditLineManager public clm;
    LendingPool public pool;
    FeeCollector public feeCollector;
    LiquidationManager public liqMgr;
    WhitelistRegistry public whitelist;
    RateLimiter public rateLimiter;
    EmergencyPause public epause;
    ProtocolRegistry public registry;
    AttestationBridge public bridge;

    function run() external {
        uint256 deployerKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address admin = vm.addr(deployerKey);
        address treasury = vm.envAddress("TREASURY_ADDRESS");
        address usdc = vm.envAddress("USDC_ADDRESS");
        address keeper = vm.envAddress("KEEPER_ADDRESS");
        address attestor = vm.envAddress("ATTESTOR_ADDRESS");
        uint8 quorum = uint8(vm.envUint("QUORUM"));

        vm.startBroadcast(deployerKey);

        _deployProxies(admin, treasury, usdc, quorum);
        _wireRoles(admin, keeper, attestor);
        _registerAddresses(admin);

        vm.stopBroadcast();

        _printAddresses();
    }

    // ── Step 1: deploy all proxies ────────────────────────────────────────────
    function _deployProxies(
        address admin,
        address treasury,
        address usdc,
        uint8 quorum
    ) internal {
        stakeVault = SBTStakeVault(
            _proxy(
                address(new SBTStakeVault()),
                abi.encodeCall(
                    SBTStakeVault.initialize,
                    (admin, treasury, usdc)
                )
            )
        );

        sbt = ReputationSBT(
            _proxy(
                address(new ReputationSBT()),
                abi.encodeCall(
                    ReputationSBT.initialize,
                    (admin, treasury, address(stakeVault))
                )
            )
        );

        iae = InterestAccrualEngine(
            _proxy(
                address(new InterestAccrualEngine()),
                abi.encodeCall(
                    InterestAccrualEngine.initialize,
                    (admin, treasury)
                )
            )
        );

        scoreEngine = ScoreEngine(
            _proxy(
                address(new ScoreEngine()),
                abi.encodeCall(
                    ScoreEngine.initialize,
                    (admin, treasury, address(sbt))
                )
            )
        );

        reserve = ReserveModule(
            _proxy(
                address(new ReserveModule()),
                abi.encodeCall(
                    ReserveModule.initialize,
                    (admin, treasury, usdc)
                )
            )
        );

        clm = CreditLineManager(
            _proxy(
                address(new CreditLineManager()),
                abi.encodeCall(
                    CreditLineManager.initialize,
                    (admin, treasury, address(scoreEngine))
                )
            )
        );

        pool = LendingPool(
            _proxy(
                address(new LendingPool()),
                abi.encodeCall(LendingPool.initialize, (admin, treasury, usdc))
            )
        );

        feeCollector = FeeCollector(
            _proxy(
                address(new FeeCollector()),
                abi.encodeCall(
                    FeeCollector.initialize,
                    (admin, treasury, usdc, address(reserve), address(pool))
                )
            )
        );

        liqMgr = LiquidationManager(
            _proxy(
                address(new LiquidationManager()),
                abi.encodeCall(
                    LiquidationManager.initialize,
                    (
                        admin,
                        treasury,
                        address(pool),
                        address(scoreEngine),
                        address(clm),
                        address(reserve)
                    )
                )
            )
        );

        whitelist = WhitelistRegistry(
            _proxy(
                address(new WhitelistRegistry()),
                abi.encodeCall(WhitelistRegistry.initialize, (admin, treasury))
            )
        );

        rateLimiter = RateLimiter(
            _proxy(
                address(new RateLimiter()),
                abi.encodeCall(RateLimiter.initialize, (admin, treasury))
            )
        );

        address[] memory pausables = new address[](2);
        pausables[0] = address(pool);
        pausables[1] = address(scoreEngine);
        epause = EmergencyPause(
            _proxy(
                address(new EmergencyPause()),
                abi.encodeCall(
                    EmergencyPause.initialize,
                    (admin, treasury, pausables)
                )
            )
        );

        registry = ProtocolRegistry(
            _proxy(
                address(new ProtocolRegistry()),
                abi.encodeCall(ProtocolRegistry.initialize, (admin, treasury))
            )
        );

        bridge = AttestationBridge(
            _proxy(
                address(new AttestationBridge()),
                abi.encodeCall(
                    AttestationBridge.initialize,
                    (admin, treasury, address(scoreEngine), quorum)
                )
            )
        );
    }

    // ── Step 2: wire all cross-contract roles ─────────────────────────────────
    function _wireRoles(
        address admin,
        address keeper,
        address attestor
    ) internal {
        // LendingPool module addresses
        pool.setSbtContract(address(sbt));
        pool.setScoreEngine(address(scoreEngine));
        pool.setCreditLineManager(address(clm));
        pool.setInterestAccrualEngine(address(iae));
        pool.setReserveModule(address(reserve));
        pool.setFeeCollector(address(feeCollector));
        pool.setWhitelistRegistry(address(whitelist));
        pool.setRateLimiter(address(rateLimiter));

        // SBT
        sbt.grantRole(sbt.SCORE_ENGINE_ROLE(), address(scoreEngine));
        stakeVault.grantRole(stakeVault.SBT_CONTRACT_ROLE(), address(sbt));

        // ScoreEngine
        scoreEngine.grantRole(scoreEngine.LENDING_POOL_ROLE(), address(pool));
        scoreEngine.grantRole(scoreEngine.LENDING_POOL_ROLE(), address(liqMgr));
        scoreEngine.grantRole(scoreEngine.BRIDGE_ROLE(), address(bridge));

        // CreditLineManager
        clm.grantRole(clm.LENDING_POOL_ROLE(), address(pool));
        clm.grantRole(clm.GUARDIAN_ROLE(), address(liqMgr));

        // ReserveModule — pool funds it via interest; liqMgr absorbs losses
        reserve.grantRole(reserve.LENDING_POOL_ROLE(), address(pool));
        reserve.grantRole(reserve.LENDING_POOL_ROLE(), address(liqMgr));

        // FeeCollector
        feeCollector.grantRole(feeCollector.LENDING_POOL_ROLE(), address(pool));

        // LendingPool grants liqMgr permission to call markDefaulted/markWrittenOff
        pool.grantRole(pool.LIQUIDATION_MANAGER_ROLE(), address(liqMgr));

        // LiquidationManager keeper roles
        liqMgr.grantRole(liqMgr.KEEPER_ROLE(), keeper);
        liqMgr.grantRole(liqMgr.LIQUIDATION_BOT_ROLE(), keeper);

        // AttestationBridge attestor
        bridge.grantRole(bridge.ATTESTOR_ROLE(), attestor);

        // EmergencyPause needs pause/unpause rights
        pool.grantRole(pool.PAUSER_ROLE(), address(epause));
        pool.grantRole(pool.GOVERNOR_ROLE(), address(epause));
        scoreEngine.grantRole(scoreEngine.PAUSER_ROLE(), address(epause));
        scoreEngine.grantRole(scoreEngine.GOVERNOR_ROLE(), address(epause));

        // Silence unused warning
        (admin);
    }

    // ── Step 3: register all addresses in ProtocolRegistry ───────────────────
    function _registerAddresses(address /*admin*/) internal {
        registry.setAddress(keccak256("LendingPool"), address(pool));
        registry.setAddress(keccak256("ReputationSBT"), address(sbt));
        registry.setAddress(keccak256("ScoreEngine"), address(scoreEngine));
        registry.setAddress(keccak256("CreditLineManager"), address(clm));
        registry.setAddress(keccak256("InterestAccrualEngine"), address(iae));
        registry.setAddress(keccak256("ReserveModule"), address(reserve));
        registry.setAddress(keccak256("FeeCollector"), address(feeCollector));
        registry.setAddress(keccak256("LiquidationManager"), address(liqMgr));
        registry.setAddress(keccak256("SBTStakeVault"), address(stakeVault));
        registry.setAddress(keccak256("WhitelistRegistry"), address(whitelist));
        registry.setAddress(keccak256("RateLimiter"), address(rateLimiter));
        registry.setAddress(keccak256("EmergencyPause"), address(epause));
        registry.setAddress(keccak256("AttestationBridge"), address(bridge));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    function _proxy(
        address impl,
        bytes memory data
    ) internal returns (address) {
        return address(new ERC1967Proxy(impl, data));
    }

    function _printAddresses() internal view {
        console2.log("\n=== TraceCredit Protocol Deployment ===");
        console2.log("SBTStakeVault          :", address(stakeVault));
        console2.log("ReputationSBT          :", address(sbt));
        console2.log("InterestAccrualEngine  :", address(iae));
        console2.log("ScoreEngine            :", address(scoreEngine));
        console2.log("ReserveModule          :", address(reserve));
        console2.log("CreditLineManager      :", address(clm));
        console2.log("LendingPool            :", address(pool));
        console2.log("FeeCollector           :", address(feeCollector));
        console2.log("LiquidationManager     :", address(liqMgr));
        console2.log("WhitelistRegistry      :", address(whitelist));
        console2.log("RateLimiter            :", address(rateLimiter));
        console2.log("EmergencyPause         :", address(epause));
        console2.log("ProtocolRegistry       :", address(registry));
        console2.log("AttestationBridge      :", address(bridge));
        console2.log("=======================================\n");
    }
}
