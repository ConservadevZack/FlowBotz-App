"""
Caching Service
Redis-based caching with connection pooling and advanced patterns
"""

import os
import json
import pickle
from typing import Optional, Any, Dict, List, Union
from datetime import datetime, timedelta
import redis.asyncio as redis
import asyncio
from contextlib import asynccontextmanager

class CachingService:
    """Enterprise caching service with Redis backend"""
    
    def __init__(self):
        self.redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
        self.redis_pool = None
        self.default_ttl = 3600  # 1 hour
        self.max_connections = 20
        
        # Cache key prefixes
        self.prefixes = {
            "user": "user:",
            "design": "design:",
            "ai_generation": "ai_gen:",
            "analytics": "analytics:",
            "rate_limit": "rate:",
            "session": "session:",
            "webhook": "webhook:"
        }
        
        # Initialize connection pool
        asyncio.create_task(self._init_redis_pool())
    
    async def _init_redis_pool(self):
        """Initialize Redis connection pool"""
        try:
            self.redis_pool = redis.ConnectionPool.from_url(
                self.redis_url,
                max_connections=self.max_connections,
                retry_on_timeout=True,
                socket_keepalive=True,
                socket_keepalive_options={}
            )
            
            # Test connection
            async with redis.Redis(connection_pool=self.redis_pool) as r:
                await r.ping()
                print("✅ Redis connection established")
                
        except Exception as e:
            print(f"❌ Redis connection failed: {e}")
            # Fall back to in-memory cache for development
            self.redis_pool = None
    
    @asynccontextmanager
    async def get_redis(self):
        """Get Redis client from pool"""
        if self.redis_pool:
            async with redis.Redis(connection_pool=self.redis_pool) as client:
                yield client
        else:
            # Fall back to mock for development
            yield MockRedis()
    
    async def set(
        self, 
        key: str, 
        value: Any, 
        ttl: Optional[int] = None,
        compress: bool = False
    ) -> bool:
        """Set cache value with optional TTL and compression"""
        try:
            if ttl is None:
                ttl = self.default_ttl
            
            # Serialize value
            if isinstance(value, (dict, list)):
                serialized = json.dumps(value, default=str)
            elif isinstance(value, (str, int, float, bool)):
                serialized = str(value)
            else:
                # Use pickle for complex objects
                serialized = pickle.dumps(value)
                compress = True
            
            async with self.get_redis() as r:
                if compress:
                    # Use Redis compression
                    await r.set(f"compressed:{key}", serialized, ex=ttl)
                else:
                    await r.set(key, serialized, ex=ttl)
                
                return True
                
        except Exception as e:
            print(f"Cache set error: {e}")
            return False
    
    async def get(
        self, 
        key: str, 
        default: Any = None
    ) -> Any:
        """Get cache value"""
        try:
            async with self.get_redis() as r:
                # Check for compressed version first
                compressed_value = await r.get(f"compressed:{key}")
                if compressed_value:
                    return pickle.loads(compressed_value)
                
                # Get regular value
                value = await r.get(key)
                if value is None:
                    return default
                
                # Try to deserialize as JSON
                try:
                    return json.loads(value)
                except json.JSONDecodeError:
                    # Return as string
                    return value.decode() if isinstance(value, bytes) else value
                    
        except Exception as e:
            print(f"Cache get error: {e}")
            return default
    
    async def delete(self, key: str) -> bool:
        """Delete cache key"""
        try:
            async with self.get_redis() as r:
                # Delete both regular and compressed versions
                deleted = await r.delete(key, f"compressed:{key}")
                return deleted > 0
                
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False
    
    async def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            async with self.get_redis() as r:
                return await r.exists(key) or await r.exists(f"compressed:{key}")
                
        except Exception as e:
            print(f"Cache exists error: {e}")
            return False
    
    async def expire(self, key: str, ttl: int) -> bool:
        """Set expiration time for key"""
        try:
            async with self.get_redis() as r:
                return await r.expire(key, ttl)
                
        except Exception as e:
            print(f"Cache expire error: {e}")
            return False
    
    async def ttl(self, key: str) -> int:
        """Get time to live for key"""
        try:
            async with self.get_redis() as r:
                return await r.ttl(key)
                
        except Exception as e:
            print(f"Cache ttl error: {e}")
            return -1
    
    async def increment(
        self, 
        key: str, 
        amount: int = 1,
        ttl: Optional[int] = None
    ) -> int:
        """Increment counter with optional TTL"""
        try:
            async with self.get_redis() as r:
                async with r.pipeline() as pipe:
                    pipe.incr(key, amount)
                    if ttl:
                        pipe.expire(key, ttl)
                    results = await pipe.execute()
                    return results[0]
                    
        except Exception as e:
            print(f"Cache increment error: {e}")
            return 0
    
    async def set_many(
        self, 
        mapping: Dict[str, Any],
        ttl: Optional[int] = None
    ) -> bool:
        """Set multiple cache values"""
        try:
            async with self.get_redis() as r:
                async with r.pipeline() as pipe:
                    for key, value in mapping.items():
                        if isinstance(value, (dict, list)):
                            serialized = json.dumps(value, default=str)
                        else:
                            serialized = str(value)
                        
                        pipe.set(key, serialized, ex=ttl or self.default_ttl)
                    
                    await pipe.execute()
                    return True
                    
        except Exception as e:
            print(f"Cache set_many error: {e}")
            return False
    
    async def get_many(self, keys: List[str]) -> Dict[str, Any]:
        """Get multiple cache values"""
        try:
            async with self.get_redis() as r:
                values = await r.mget(keys)
                result = {}
                
                for key, value in zip(keys, values):
                    if value is not None:
                        try:
                            result[key] = json.loads(value)
                        except json.JSONDecodeError:
                            result[key] = value.decode() if isinstance(value, bytes) else value
                
                return result
                
        except Exception as e:
            print(f"Cache get_many error: {e}")
            return {}
    
    async def delete_pattern(self, pattern: str) -> int:
        """Delete all keys matching pattern"""
        try:
            async with self.get_redis() as r:
                keys = []
                async for key in r.scan_iter(match=pattern):
                    keys.append(key)
                
                if keys:
                    return await r.delete(*keys)
                return 0
                
        except Exception as e:
            print(f"Cache delete_pattern error: {e}")
            return 0
    
    async def add_to_set(self, key: str, *values: str) -> int:
        """Add values to Redis set"""
        try:
            async with self.get_redis() as r:
                return await r.sadd(key, *values)
                
        except Exception as e:
            print(f"Cache add_to_set error: {e}")
            return 0
    
    async def is_member(self, key: str, value: str) -> bool:
        """Check if value is member of set"""
        try:
            async with self.get_redis() as r:
                return await r.sismember(key, value)
                
        except Exception as e:
            print(f"Cache is_member error: {e}")
            return False
    
    async def get_set_members(self, key: str) -> List[str]:
        """Get all members of set"""
        try:
            async with self.get_redis() as r:
                members = await r.smembers(key)
                return [m.decode() if isinstance(m, bytes) else m for m in members]
                
        except Exception as e:
            print(f"Cache get_set_members error: {e}")
            return []
    
    async def add_to_sorted_set(
        self, 
        key: str, 
        score: float, 
        value: str,
        ttl: Optional[int] = None
    ) -> bool:
        """Add value to sorted set with score"""
        try:
            async with self.get_redis() as r:
                async with r.pipeline() as pipe:
                    pipe.zadd(key, {value: score})
                    if ttl:
                        pipe.expire(key, ttl)
                    results = await pipe.execute()
                    return results[0] > 0
                    
        except Exception as e:
            print(f"Cache add_to_sorted_set error: {e}")
            return False
    
    async def get_sorted_set_range(
        self, 
        key: str, 
        start: int = 0, 
        end: int = -1,
        desc: bool = False
    ) -> List[str]:
        """Get range from sorted set"""
        try:
            async with self.get_redis() as r:
                if desc:
                    members = await r.zrevrange(key, start, end)
                else:
                    members = await r.zrange(key, start, end)
                
                return [m.decode() if isinstance(m, bytes) else m for m in members]
                
        except Exception as e:
            print(f"Cache get_sorted_set_range error: {e}")
            return []
    
    async def cache_function_result(
        self,
        func_name: str,
        args: tuple,
        kwargs: dict,
        result: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """Cache function result with argument-based key"""
        # Create cache key from function name and arguments
        args_str = str(args) + str(sorted(kwargs.items()))
        key = f"func:{func_name}:{hash(args_str)}"
        
        return await self.set(key, result, ttl or self.default_ttl)
    
    async def get_cached_function_result(
        self,
        func_name: str,
        args: tuple,
        kwargs: dict
    ) -> Any:
        """Get cached function result"""
        args_str = str(args) + str(sorted(kwargs.items()))
        key = f"func:{func_name}:{hash(args_str)}"
        
        return await self.get(key)
    
    async def invalidate_user_cache(self, user_id: str):
        """Invalidate all cache entries for a user"""
        patterns = [
            f"user:{user_id}:*",
            f"design:*:user:{user_id}",
            f"analytics:user:{user_id}:*"
        ]
        
        for pattern in patterns:
            await self.delete_pattern(pattern)
    
    async def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            async with self.get_redis() as r:
                info = await r.info()
                return {
                    "connected_clients": info.get("connected_clients", 0),
                    "used_memory": info.get("used_memory_human", "0B"),
                    "keyspace_hits": info.get("keyspace_hits", 0),
                    "keyspace_misses": info.get("keyspace_misses", 0),
                    "hit_rate": self._calculate_hit_rate(
                        info.get("keyspace_hits", 0),
                        info.get("keyspace_misses", 0)
                    )
                }
                
        except Exception as e:
            print(f"Cache stats error: {e}")
            return {}
    
    def _calculate_hit_rate(self, hits: int, misses: int) -> float:
        """Calculate cache hit rate"""
        total = hits + misses
        if total == 0:
            return 0.0
        return (hits / total) * 100
    
    async def health_check(self) -> Dict[str, Any]:
        """Check cache health"""
        try:
            async with self.get_redis() as r:
                start_time = datetime.utcnow()
                await r.ping()
                response_time = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                return {
                    "status": "healthy",
                    "response_time_ms": response_time,
                    "connection_pool_size": self.max_connections
                }
                
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }

class MockRedis:
    """Mock Redis client for development/testing"""
    
    def __init__(self):
        self.data = {}
        self.expiries = {}
    
    async def ping(self):
        return True
    
    async def set(self, key: str, value: Any, ex: Optional[int] = None):
        self.data[key] = value
        if ex:
            self.expiries[key] = datetime.utcnow() + timedelta(seconds=ex)
        return True
    
    async def get(self, key: str):
        # Check expiry
        if key in self.expiries and datetime.utcnow() > self.expiries[key]:
            del self.data[key]
            del self.expiries[key]
            return None
        
        return self.data.get(key)
    
    async def delete(self, *keys):
        count = 0
        for key in keys:
            if key in self.data:
                del self.data[key]
                if key in self.expiries:
                    del self.expiries[key]
                count += 1
        return count
    
    async def exists(self, key: str):
        return key in self.data
    
    async def expire(self, key: str, ttl: int):
        if key in self.data:
            self.expiries[key] = datetime.utcnow() + timedelta(seconds=ttl)
            return True
        return False
    
    async def ttl(self, key: str):
        if key in self.expiries:
            remaining = (self.expiries[key] - datetime.utcnow()).total_seconds()
            return int(remaining) if remaining > 0 else -2
        return -1
    
    async def incr(self, key: str, amount: int = 1):
        current = int(self.data.get(key, 0))
        self.data[key] = current + amount
        return self.data[key]
    
    async def mget(self, keys):
        return [self.data.get(key) for key in keys]
    
    async def sadd(self, key: str, *values):
        if key not in self.data:
            self.data[key] = set()
        count = 0
        for value in values:
            if value not in self.data[key]:
                self.data[key].add(value)
                count += 1
        return count
    
    async def sismember(self, key: str, value: str):
        return key in self.data and value in self.data[key]
    
    async def smembers(self, key: str):
        return list(self.data.get(key, set()))
    
    async def zadd(self, key: str, mapping: dict):
        if key not in self.data:
            self.data[key] = {}
        count = 0
        for value, score in mapping.items():
            if value not in self.data[key]:
                count += 1
            self.data[key][value] = score
        return count
    
    async def zrange(self, key: str, start: int, end: int):
        if key not in self.data:
            return []
        items = sorted(self.data[key].items(), key=lambda x: x[1])
        if end == -1:
            return [item[0] for item in items[start:]]
        return [item[0] for item in items[start:end+1]]
    
    async def zrevrange(self, key: str, start: int, end: int):
        if key not in self.data:
            return []
        items = sorted(self.data[key].items(), key=lambda x: x[1], reverse=True)
        if end == -1:
            return [item[0] for item in items[start:]]
        return [item[0] for item in items[start:end+1]]
    
    async def scan_iter(self, match: str):
        # Simple pattern matching
        import fnmatch
        for key in self.data:
            if fnmatch.fnmatch(key, match):
                yield key
    
    async def info(self):
        return {
            "connected_clients": 1,
            "used_memory_human": f"{len(str(self.data))}B",
            "keyspace_hits": 100,
            "keyspace_misses": 10
        }
    
    def pipeline(self):
        return MockPipeline(self)

class MockPipeline:
    """Mock Redis pipeline"""
    
    def __init__(self, redis_client):
        self.redis = redis_client
        self.commands = []
    
    def incr(self, key: str, amount: int = 1):
        self.commands.append(("incr", key, amount))
        return self
    
    def expire(self, key: str, ttl: int):
        self.commands.append(("expire", key, ttl))
        return self
    
    def set(self, key: str, value: Any, ex: Optional[int] = None):
        self.commands.append(("set", key, value, ex))
        return self
    
    def zadd(self, key: str, mapping: dict):
        self.commands.append(("zadd", key, mapping))
        return self
    
    async def execute(self):
        results = []
        for cmd in self.commands:
            if cmd[0] == "incr":
                result = await self.redis.incr(cmd[1], cmd[2])
            elif cmd[0] == "expire":
                result = await self.redis.expire(cmd[1], cmd[2])
            elif cmd[0] == "set":
                result = await self.redis.set(cmd[1], cmd[2], ex=cmd[3])
            elif cmd[0] == "zadd":
                result = await self.redis.zadd(cmd[1], cmd[2])
            else:
                result = True
            results.append(result)
        return results