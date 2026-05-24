// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {Test} from "forge-std/Test.sol";

import {MockERC20} from "./MockERC20.sol";

import {ReputationSBT}        from "../../src/core/ReputationSBT.sol";
import {ScoreEngine}           from "../../src/core/ScoreEngine.sol";
import {LendingPool}           from "../../src/core/LendingPool.sol";
import {ReserveModule}         from "../../src/core/ReserveModule.sol";
import {CreditLineManager}     from "../../src/modules/CreditLineManager.sol";
import {InterestAccrualEngine} from "../../src/modules/InterestAccrualEngine.sol";
import {LiquidationManager}    from "../../src/modules/LiquidationManager.sol";
import {WhitelistRegistry}     from "../../src/modules/WhitelistRegistry.sol";
import {FeeCollector}          from "../../src/modules/FeeCollector.sol";
import {EmergencyPause}        from "../../src/modules/EmergencyPause.sol";
import {ProtocolRegistry}      from "../../src/modules/ProtocolRegistry.sol";
import {RateLimiter}           from "../../src/modules/RateLimiter.sol";
import {SBTStakeVault}         from "../../src/modules/SBTStakeVault.sol";
import {AttestationBridge}     from "../../src/oracle/AttestationBridge.sol";

abstract contract DeployHelper is Test {
    address internal admin    = makeAddr("admin");
    address internal treasury = makeAddr("treasury");

    MockERC20             internal usdc;
    ReputationSBT         internal sbt;
    ScoreEngine           internal scoreEngine;
    LendingPool           internal pool;
    ReserveModule         internal reserve;
    CreditLineManager     internal clm;
    InterestAccrualEngine internal iae;
    LiquidationManager    internal liqMgr;
    WhitelistRegistry     internal whitelist;
    FeeCollector          internal feeCol;
    EmergencyPause        internal epause;
    ProtocolRegistry      internal registry;
    RateLimiter           internal rateLimiter;
    SBTStakeVault         internal stakeVault;
    AttestationBridge     internal bridge;

    function _deploy() internal {
        usdc = new MockERC20("USD Coin", "USDC", 6);

        stakeVault = SBTStakeVault(_proxy(
            address(new SBTStakeVault()),
            abi.encodeCall(SBTStakeVault.initialize, (admin, treasury, address(usdc)))
        ));

        sbt = ReputationSBT(_proxy(
            address(new ReputationSBT()),
            abi.encodeCall(ReputationSBT.initialize, (admin, treasury, address(stakeVault)))
        ));

        iae = InterestAccrualEngine(_proxy(
            address(new InterestAccrualEngine()),
            abi.encodeCall(InterestAccrualEngine.initialize, (admin, treasury))
        ));

        scoreEngine = ScoreEngine(_proxy(
            address(new ScoreEngine()),
            abi.encodeCall(ScoreEngine.initialize, (admin, treasury, address(sbt)))
        ));

        reserve = ReserveModule(_proxy(
            address(new ReserveModule()),
            abi.encodeCall(ReserveModule.initialize, (admin, treasury, address(usdc)))
        ));

        clm = CreditLineManager(_proxy(
            address(new CreditLineManager()),
            abi.encodeCall(CreditLineManager.initialize, (admin, treasury, address(scoreEngine)))
        ));

        pool = LendingPool(_proxy(
            address(new LendingPool()),
            abi.encodeCall(LendingPool.initialize, (admin, treasury, address(usdc)))
        ));

        feeCol = FeeCollector(_proxy(
            address(new FeeCollector()),
            abi.encodeCall(FeeCollector.initialize,
                (admin, treasury, address(usdc), address(reserve), address(pool)))
        ));

        liqMgr = LiquidationManager(_proxy(
            address(new LiquidationManager()),
            abi.encodeCall(LiquidationManager.initialize, (
                admin, treasury,
                address(pool), address(scoreEngine), address(clm), address(reserve)
            ))
        ));

        whitelist = WhitelistRegistry(_proxy(
            address(new WhitelistRegistry()),
            abi.encodeCall(WhitelistRegistry.initialize, (admin, treasury))
        ));

        rateLimiter = RateLimiter(_proxy(
            address(new RateLimiter()),
            abi.encodeCall(RateLimiter.initialize, (admin, treasury))
        ));

        address[] memory pausables = new address[](2);
        pausables[0] = address(pool);
        pausables[1] = address(scoreEngine);
        epause = EmergencyPause(_proxy(
            address(new EmergencyPause()),
            abi.encodeCall(EmergencyPause.initialize, (admin, treasury, pausables))
        ));

        registry = ProtocolRegistry(_proxy(
            address(new ProtocolRegistry()),
            abi.encodeCall(ProtocolRegistry.initialize, (admin, treasury))
        ));

        bridge = AttestationBridge(_proxy(
            address(new AttestationBridge()),
            abi.encodeCall(AttestationBridge.initialize, (admin, treasury, address(scoreEngine), 2))
        ));

        _wireRoles();
    }

    function _proxy(address impl, bytes memory data) internal returns (address) {
        return address(new ERC1967Proxy(impl, data));
    }

    function _wireRoles() internal {
        vm.startPrank(admin);

        // Pool module addresses
        pool.setSbtContract(address(sbt));
        pool.setScoreEngine(address(scoreEngine));
        pool.setCreditLineManager(address(clm));
        pool.setInterestAccrualEngine(address(iae));
        pool.setReserveModule(address(reserve));
        pool.setFeeCollector(address(feeCol));
        // whitelist and rateLimiter left as address(0) (skipped) unless test enables them

        // SBT roles
        sbt.grantRole(sbt.SCORE_ENGINE_ROLE(),    address(scoreEngine));
        stakeVault.grantRole(stakeVault.SBT_CONTRACT_ROLE(), address(sbt));

        // ScoreEngine roles
        scoreEngine.grantRole(scoreEngine.LENDING_POOL_ROLE(), address(pool));
        scoreEngine.grantRole(scoreEngine.LENDING_POOL_ROLE(), address(liqMgr));
        scoreEngine.grantRole(scoreEngine.BRIDGE_ROLE(),       address(bridge));

        // CLM roles
        clm.grantRole(clm.LENDING_POOL_ROLE(), address(pool));
        clm.grantRole(clm.GUARDIAN_ROLE(),     address(liqMgr));

        // Reserve roles
        reserve.grantRole(reserve.LENDING_POOL_ROLE(), address(pool));
        reserve.grantRole(reserve.LENDING_POOL_ROLE(), address(liqMgr));

        // FeeCollector roles
        feeCol.grantRole(feeCol.LENDING_POOL_ROLE(), address(pool));

        // Pool LIQUIDATION_MANAGER_ROLE
        pool.grantRole(pool.LIQUIDATION_MANAGER_ROLE(), address(liqMgr));

        // EmergencyPause needs pause/unpause rights on contracts
        pool.grantRole(pool.PAUSER_ROLE(),    address(epause));
        pool.grantRole(pool.GOVERNOR_ROLE(),  address(epause));
        scoreEngine.grantRole(scoreEngine.PAUSER_ROLE(),   address(epause));
        scoreEngine.grantRole(scoreEngine.GOVERNOR_ROLE(), address(epause));

        vm.stopPrank();
    }

    /// @dev Mint SBT for a wallet. Provides stake USDC and approves.
    function _mintSBT(address wallet) internal {
        uint256 stake = stakeVault.stakeAmount();
        usdc.mint(wallet, stake);
        vm.prank(wallet);
        usdc.approve(address(stakeVault), stake);
        vm.prank(wallet);
        sbt.mintSBT();
    }

    /// @dev Directly set a score via the admin (who holds SCORE_ENGINE_ROLE).
    function _forceScore(address wallet, uint16 score) internal {
        vm.startPrank(admin);
        sbt.grantRole(sbt.SCORE_ENGINE_ROLE(), admin);
        sbt.updateScore(wallet, int16(int256(uint256(score))));
        vm.stopPrank();
    }

    /// @dev Setup borrower: mint SBT, set score, warp past lockup, request credit increase.
    function _setupBorrower(address borrower, uint16 score) internal {
        _mintSBT(borrower);
        _forceScore(borrower, score);
        // Warp past the longest possible lockup (90 days for Silver)
        vm.warp(block.timestamp + 91 days);
        vm.prank(borrower);
        clm.requestIncrease();
        // Warp back slightly so timestamps are reasonable for borrow tests
    }

    /// @dev Fund pool with USDC liquidity (mint to pool directly).
    function _fundPool(uint256 amount) internal {
        usdc.mint(address(pool), amount);
        // Also update the _totalOutstanding accounting by depositing properly
    }

    /// @dev Deposit USDC into pool as a liquidity provider.
    function _depositToPool(address lp, uint256 amount) internal {
        usdc.mint(lp, amount);
        vm.prank(lp);
        usdc.approve(address(pool), amount);
        vm.prank(lp);
        pool.deposit(amount, lp);
    }
}
