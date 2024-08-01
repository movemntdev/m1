# Debugging
The easiest way to debug the M1 subnet is to run it locally with...
```shell
./scripts/run.debug.sh
```

This will run an `avalanche-network-runner` local cluster with the M1 subnet. The cluster will have the following critical services:
- `0.0.0.0:9650`: the Avalanche node RPC.
- `0.0.0.0:8090`: the gRPC indexer stream.

Eventually, you should see an output like this to the terminal:
```shell
[node3] ------------inner_build_block 98dbf4c1----
[node4] ------------inner_build_block 98dbf4c1----
[node5] ------------inner_build_block 98dbf4c1----
[node4] -----accept----1---
[node5] -----accept----1---
[node3] -----accept----1---
[node2] -----accept----1---
[node1] ------------inner_build_block 98dbf4c1----
[node1] -----accept----1---
[node1] [2023-11-17T14:34:47Z INFO  subnet::vm] submit_transaction length 257
[node1] ----------notify_block_ready----success------------------
[node1] ----build_block pool tx count-------1------
[node1] --------vm_build_block------mo5UvUGgwVEEbCcgeb9JRRXvpr4UeT4yUFufS2R9UA7kXvSNQ---
[node4] ------------inner_build_block 850f6c4d----
[node1] ------------inner_build_block 850f6c4d----
[node1] -----accept----1---
[node4] -----accept----1---
[node2] ------------inner_build_block 850f6c4d----
[node2] -----accept----1---
[node5] ------------inner_build_block 850f6c4d----
[node3] ------------inner_build_block 850f6c4d----
```

## `subnet-request-proxy`
Running these without any supporting services will suffice for core protocol debugging. However, you will often want to check the e2e behavior of things like CLI and the JavaScript SDK. For that, you will need to start the `subnet-request-proxy` which is responsible for serving an Aptos-compatible API. 

To start the `subnet-request-proxy` natively on your machine, cd into the `subnet-request-proxy` directory and run:
```shell
npm i
SUBNET_SOCKET_ADDRESS="0.0.0.0:9650" npm run start
```

## Indexer Database
In order for the indexer to write to the database listening on port `5432`, you will need to start a local PostgreSQL instance. The easiest way to do this is with Docker:
```shell
docker run --name m1-indexer-db -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres
```
If you are not running the database, the trailer thread in the M1 subnet will panic. However, this will not affect the rest of the execution.

# WIP
We are pursuing several improvements to local debugging and testing.

## Docker Compose
We are working on a Docker Compose file which will allow you to run all services locally without additional setup.

## Simulated Network Activity Prologue
We are working to provide a script which will simulate the network activity which to provide an option to test against a more realistic network. This will be particularly useful for testing the indexer.

## Improved Parameterization
We are working on exposing more of the variables through to the runner scripts which network the services, for example, port numbers and the Avalanche node config.
