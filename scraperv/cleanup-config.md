# 🧹 Cleanup Configuration Guide

## 📋 Overview

The system now includes automatic cleanup to prevent expired hackathon data from accumulating indefinitely. This guide explains how to configure and use the cleanup features.

## ⚙️ Configuration Settings

### Environment Variables

```bash
# How long to keep expired hackathons (default: 30 days)
CLEANUP_EXPIRED_AFTER_DAYS=30

# How long to keep inactive hackathons (default: 90 days)
CLEANUP_INACTIVE_AFTER_DAYS=90
```

### Default Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `CLEANUP_EXPIRED_AFTER_DAYS` | 30 | Days to keep expired hackathons |
| `CLEANUP_INACTIVE_AFTER_DAYS` | 90 | Days to keep inactive hackathons |

## 🔄 Cleanup Behavior

### Automatic Cleanup

Cleanup happens automatically during:
- **Update operations** (`/api/update`)
- **Regular scraping** (if using update mode)

### Manual Cleanup

Trigger cleanup manually:
```bash
curl -X POST http://localhost:3001/api/cleanup-old
```

## 📊 Cleanup Rules

### 1. Expired Hackathons
- **Condition**: `status === 'expired'` AND `deadline < (now - CLEANUP_EXPIRED_AFTER_DAYS)`
- **Example**: Hackathon expired 31 days ago → Removed
- **Purpose**: Remove old expired hackathons

### 2. Inactive Hackathons
- **Condition**: No deadline AND `lastUpdated < (now - CLEANUP_INACTIVE_AFTER_DAYS)`
- **Example**: Hackathon not updated in 91 days → Removed
- **Purpose**: Remove hackathons that disappeared from platforms

## 📈 Data Growth Scenarios

### Without Cleanup (Old System)
```
Day 1:  10 active hackathons
Day 30: 10 active + 20 expired = 30 total
Day 60: 10 active + 50 expired = 60 total
Day 90: 10 active + 80 expired = 90 total
```

### With Cleanup (New System)
```
Day 1:  10 active hackathons
Day 30: 10 active + 20 expired = 30 total
Day 31: 10 active + 20 expired = 30 total (cleanup removes expired > 30 days)
Day 60: 10 active + 30 expired = 40 total
Day 61: 10 active + 30 expired = 40 total (cleanup removes expired > 30 days)
```

## 🎯 Recommended Settings

### For Production (Conservative)
```bash
CLEANUP_EXPIRED_AFTER_DAYS=60    # Keep expired for 2 months
CLEANUP_INACTIVE_AFTER_DAYS=180  # Keep inactive for 6 months
```

### For Development (Aggressive)
```bash
CLEANUP_EXPIRED_AFTER_DAYS=7     # Keep expired for 1 week
CLEANUP_INACTIVE_AFTER_DAYS=30   # Keep inactive for 1 month
```

### For Testing (Very Aggressive)
```bash
CLEANUP_EXPIRED_AFTER_DAYS=1     # Keep expired for 1 day
CLEANUP_INACTIVE_AFTER_DAYS=7    # Keep inactive for 1 week
```

## 🔍 Monitoring Cleanup

### Check Cleanup Logs
```bash
# View server logs for cleanup messages
tail -f server.log | grep "🗑️\|🧹"
```

### API Response Example
```json
{
  "message": "Cleanup completed successfully",
  "originalCount": 45,
  "finalCount": 32,
  "removedCount": 13,
  "cleanupSettings": {
    "expiredAfterDays": 30,
    "inactiveAfterDays": 90
  }
}
```

## ⚠️ Important Considerations

### 1. Data Loss
- **Cleanup is irreversible** - removed hackathons cannot be recovered
- **Backup before cleanup** if you need historical data
- **Test cleanup settings** in development first

### 2. Performance Impact
- **Cleanup runs during updates** - may slow down update operations
- **Large datasets** - cleanup time increases with data size
- **Memory usage** - cleanup loads all hackathons into memory

### 3. Business Logic
- **Historical analysis** - consider if you need old data for analytics
- **Audit trails** - consider logging removed hackathons
- **Compliance** - ensure cleanup doesn't violate data retention policies

## 🛠️ Customization Examples

### Keep Everything (Disable Cleanup)
```bash
CLEANUP_EXPIRED_AFTER_DAYS=36500  # 100 years
CLEANUP_INACTIVE_AFTER_DAYS=36500 # 100 years
```

### Archive Instead of Delete
```javascript
// Modify cleanupOldHackathons() to archive instead of delete
function cleanupOldHackathons(hackathons) {
  // ... existing logic ...
  
  // Instead of removing, mark as archived
  const archivedHackathons = removedHackathons.map(h => ({
    ...h,
    status: 'archived',
    archivedAt: new Date().toISOString()
  }));
  
  // Save to archive file
  await fs.writeFile(ARCHIVE_FILE, JSON.stringify(archivedHackathons, null, 2));
  
  return cleanedHackathons;
}
```

### Selective Cleanup
```javascript
// Only clean up certain sources
function cleanupOldHackathons(hackathons) {
  return hackathons.filter(hackathon => {
    // Keep all Devpost hackathons
    if (hackathon.source === 'Devpost') return true;
    
    // Apply normal cleanup rules for others
    // ... existing logic ...
  });
}
```

## 📞 Troubleshooting

### Cleanup Not Working
1. **Check environment variables** - ensure they're set correctly
2. **Verify dates** - check if hackathons meet cleanup criteria
3. **Check logs** - look for cleanup messages in server logs
4. **Manual trigger** - test with `/api/cleanup-old` endpoint

### Too Much Data Removed
1. **Increase retention periods** - set higher values for cleanup days
2. **Check date parsing** - ensure deadlines are parsed correctly
3. **Review cleanup logic** - verify the filtering conditions
4. **Restore from backup** - if you have a backup of the data

### Performance Issues
1. **Batch processing** - process cleanup in smaller batches
2. **Optimize date comparisons** - use more efficient date operations
3. **Reduce frequency** - run cleanup less often
4. **Database migration** - consider moving to a database for better performance 