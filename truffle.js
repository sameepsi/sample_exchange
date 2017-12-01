module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gas:6000000
    },
    rinkeby: {
      host: "localhost",
      port: 8545,
      network_id: "4", // Rinkeby network id
      gas:6000000,
      from:"0xa84342c192F6E6c1853c6428373Fd0c4BC00DB3A"
    }
  }
};
