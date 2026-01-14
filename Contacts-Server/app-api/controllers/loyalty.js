const fs = require('fs').promises;
const path = require('path');

// "Baza" fajlovi
const LOYALTY_PATH = path.join(__dirname, '..', 'database', 'loyalty.json');
const REWARDS_PATH = path.join(__dirname, '..', 'database', 'rewards.json');

// write-queue kao u contacts/auth
let writeQueue = Promise.resolve();
function serializeWrite(fn) {
  const next = writeQueue.then(() => fn(), () => fn());
  writeQueue = next.catch(() => {});
  return next;
}

async function atomicWrite(filePath, data) {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.tmp-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  await fs.writeFile(tmp, data, 'utf8');
  try {
    await fs.rename(tmp, filePath);
    return;
  } catch (err) {
    if (err && err.code === 'EXDEV') {
      await fs.copyFile(tmp, filePath);
      await fs.unlink(tmp);
      return;
    }
    if (err && (err.code === 'EEXIST' || err.code === 'EPERM' || err.code === 'ENOTEMPTY')) {
      try { await fs.unlink(filePath); } catch (e) {}
      await fs.rename(tmp, filePath);
      return;
    }
    try { await fs.unlink(tmp); } catch (e) {}
    throw err;
  }
}

async function readJsonSafe(filePath, fallback) {
  try {
    const txt = await fs.readFile(filePath, 'utf8');
    return JSON.parse(txt || fallback);
  } catch (e) {
    if (e.code === 'ENOENT') return JSON.parse(fallback);
    throw e;
  }
}

// helper: nadji loyalty record za userId (ili napravi novi)
async function ensureLoyaltyForUser(userId) {
  const loyalty = await readJsonSafe(LOYALTY_PATH, '[]');
  let rec = loyalty.find(x => Number(x.userId) === Number(userId));
  if (!rec) {
    rec = {
      userId: Number(userId),
      points: 1280,
      tier: 'Gold',
      nextTier: 'Platinum',
      pointsToNextTier: 720,
      tierGoal: 2000,
      customerName: 'Marina',
      memberId: `BL-2026-${String(userId).padStart(4, '0')}`,
      redeemed: [] // rewardId list
    };
    loyalty.push(rec);
    await serializeWrite(async () => {
      await atomicWrite(LOYALTY_PATH, JSON.stringify(loyalty, null, 2));
    });
  }
  return rec;
}

// GET /api/dashboard (protected)
async function getDashboard(req, res) {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const rec = await ensureLoyaltyForUser(userId);
    const rewards = await readJsonSafe(REWARDS_PATH, '[]');

    return res.status(200).json({
      customerName: rec.customerName,
      memberId: rec.memberId,
      points: rec.points,
      tier: rec.tier,
      nextTier: rec.nextTier,
      pointsToNextTier: rec.pointsToNextTier,
      tierGoal: rec.tierGoal,
      rewards
    });
  } catch (err) {
    console.error('Failed to get dashboard:', err);
    return res.status(500).json({ error: 'Failed to get dashboard' });
  }
}

// POST /api/redeem/:rewardId (protected)
async function redeemReward(req, res) {
  try {
    const userId = req.user?.userId;
    const rewardId = Number(req.params.rewardId);

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!rewardId) return res.status(400).json({ error: 'Missing rewardId' });

    const rewards = await readJsonSafe(REWARDS_PATH, '[]');
    const reward = rewards.find(r => Number(r.id) === rewardId);
    if (!reward) return res.status(404).json({ error: 'Reward not found' });

    const loyalty = await readJsonSafe(LOYALTY_PATH, '[]');
    let rec = loyalty.find(x => Number(x.userId) === Number(userId));
    if (!rec) rec = await ensureLoyaltyForUser(userId);

    if (rec.points < reward.cost) {
      return res.status(400).json({ error: 'Not enough points' });
    }

    // oduzmi poene + zapamti redemption
    rec.points -= reward.cost;
    rec.redeemed = rec.redeemed || [];
    rec.redeemed.push({ rewardId, at: new Date().toISOString() });

    await serializeWrite(async () => {
      await atomicWrite(LOYALTY_PATH, JSON.stringify(loyalty, null, 2));
    });

    return res.status(200).json({
      message: 'Redeemed',
      newPoints: rec.points
    });
  } catch (err) {
    console.error('Failed to redeem reward:', err);
    return res.status(500).json({ error: 'Failed to redeem reward' });
  }
}

module.exports = {
  getDashboard,
  redeemReward
};
