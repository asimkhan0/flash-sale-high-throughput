/**
 * Lua Scripts for Atomic Redis Operations
 * These scripts execute atomically in Redis, preventing race conditions
 */

/**
 * Atomic stock decrement script
 * Returns: [success (0 or 1), remaining stock]
 * 
 * KEYS[1]: stock key
 * ARGV[1]: (unused, for future extensibility)
 */
export const DECREMENT_STOCK_SCRIPT = `
local stock = tonumber(redis.call('GET', KEYS[1]))
if stock == nil then
  return {0, -1}
end
if stock > 0 then
  local remaining = redis.call('DECR', KEYS[1])
  return {1, remaining}
end
return {0, 0}
`;

/**
 * Atomic purchase attempt script
 * Checks if user already purchased, if not, marks as purchased and decrements stock
 * Returns: [status code, remaining stock or purchase timestamp]
 * 
 * Status codes:
 * 0 = Already purchased
 * 1 = Success
 * 2 = Out of stock
 * 
 * KEYS[1]: stock key
 * KEYS[2]: purchase hash key (for storing all purchases)
 * ARGV[1]: user ID
 * ARGV[2]: current timestamp
 */
export const ATOMIC_PURCHASE_SCRIPT = `
-- Check if user already purchased
local existingPurchase = redis.call('HGET', KEYS[2], ARGV[1])
if existingPurchase then
  return {0, existingPurchase}
end

-- Check and decrement stock
local stock = tonumber(redis.call('GET', KEYS[1]))
if stock == nil or stock <= 0 then
  return {2, 0}
end

-- Decrement stock
local remaining = redis.call('DECR', KEYS[1])

-- Record purchase with timestamp
redis.call('HSET', KEYS[2], ARGV[1], ARGV[2])

return {1, remaining}
`;

/**
 * Initialize stock script
 * Sets the initial stock value only if it doesn't exist
 * 
 * KEYS[1]: stock key
 * ARGV[1]: initial stock value
 */
export const INIT_STOCK_SCRIPT = `
local exists = redis.call('EXISTS', KEYS[1])
if exists == 0 then
  redis.call('SET', KEYS[1], ARGV[1])
  return 1
end
return 0
`;
