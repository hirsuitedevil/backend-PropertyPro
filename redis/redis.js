const { Redis } = require("@upstash/redis");
require("dotenv").config();
const redis = new Redis({
  url: "https://warm-mink-51077.upstash.io",
  token: process.env.REDIS_KEY,
});

const cacheFetch = async (keyPattern) => {
  try {
    let scanResult = await redis.keys(keyPattern);
    if (scanResult.length>0) {
      const cachedData = await redis.get(scanResult[0]);
      if (cachedData) {
        return cachedData;
      }
    }
    return null;
  } catch (error) {
    console.error("Cache Fetch Error:", error);
    throw error;
  }
};

const cacheSet = async (key, data, ttl) => {
  try {
    const stringifiedData = JSON.stringify(data);
    const cacheData = await cacheFetch(key);
    if(!cacheData){
      await redis.set(key, stringifiedData);
      if(ttl){
        await redis.expire(key, ttl, "NX");
      }
      console.log(`Data cached successfully for key: ${key}`);
    }else{
      if(ttl){
        await redis.expire(`user:${cacheData.email}:${cacheData._id}`, ttl, "GT");
        console.log(
          `Data cached successfully for key: user:${cacheData.email}:${cacheData._id}`
        );
      }
    }
    return true;
  } catch (error) {
    console.error("Cache Set Error:", error);
    return false;
  }
};

module.exports = { cacheFetch, cacheSet };
