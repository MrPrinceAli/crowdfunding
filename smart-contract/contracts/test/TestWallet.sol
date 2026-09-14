//SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.24;

// Hanya untuk test: dompet berbasis smart contract yang butuh gas > 2300 saat menerima ETH
// (seperti multisig), sehingga transfer() akan gagal tetapi call() berhasil
contract TestWallet {
    uint256 public received;

    receive() external payable {
        received += 1;
    }
}
