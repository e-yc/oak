// swift-tools-version: 6.0

import PackageDescription

let package = Package(
    name: "OakComputerUseMacOS",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "OakComputerUseMacOSCore",
            targets: ["OakComputerUseMacOSCore"]
        ),
        .executable(
            name: "oak-computer-use-macos",
            targets: ["OakComputerUseMacOS"]
        )
    ],
    targets: [
        .target(
            name: "OakComputerUseMacOSCore",
            path: "Sources/OakComputerUseMacOSCore"
        ),
        .executableTarget(
            name: "OakComputerUseMacOS",
            dependencies: ["OakComputerUseMacOSCore"],
            path: "Sources/OakComputerUseMacOS"
        ),
        .testTarget(
            name: "OakComputerUseMacOSTests",
            dependencies: ["OakComputerUseMacOSCore"],
            path: "Tests/OakComputerUseMacOSTests"
        )
    ]
)
