const Redis = require("ioredis");

let redisClient;

const connectRedis = () => {
  redisClient = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });

  redisClient
    .connect()
    .then(() => {
      console.log("Redis Connected");
    })
    .catch((err) => {
      console.error("Redis Connection Error:", err.message);
    });

  redisClient.on("error", (err) => {
    console.error("Redis Error:", err.message);
  });
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error("Redis client not initialized");
  }
  return redisClient;
};

module.exports = { connectRedis, getRedisClient };
