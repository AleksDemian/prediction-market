// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";
import {PredictionMarket} from "../src/PredictionMarket.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);
        address usdc        = vm.envAddress("USDC_ADDRESS");

        vm.startBroadcast(deployerKey);

        // MockUSDC usdc           = new MockUSDC(deployer);
        PredictionMarket market = new PredictionMarket(address(usdc), deployer);

        vm.stopBroadcast();

        console.log("Deployer:        ", deployer);
        console.log("MockUSDC:        ", address(usdc));
        console.log("PredictionMarket:", address(market));
    }
}
