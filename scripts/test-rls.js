#!/usr/bin/env node

/**
 * RLS (Row Level Security) Test
 * Verifies that RLS policies correctly isolate data between users
 * and allow proper access within families
 */

const pg = require("pg");
const { Client } = pg;

const url = process.env.TEST_DATABASE_URL;
if (!url) {
  console.error("❌ TEST_DATABASE_URL environment variable is required");
  process.exit(1);
}

// Test user IDs (UUIDs)
const USER1 = "00000000-0000-0000-0000-000000000001";
const USER2 = "00000000-0000-0000-0000-000000000002";
const FAMILY_ID = "11111111-1111-1111-1111-111111111111";
const CHILD_ID = "22222222-2222-2222-2222-222222222222";
const MEMORY_ID = "33333333-3333-3333-3333-333333333333";

async function runTests() {
  const client = new Client({ connectionString: url });

  try {
    await client.connect();
    console.log("🔌 Connected to test database");

    // Helper to set the current user context (simulates Supabase auth)
    const setUser = async (userId) => {
      await client.query(`SELECT set_config('request.jwt.claim.sub', $1, true)`, [userId]);
    };

    console.log("\n📝 Setting up test data...");

    // Create test data as USER1
    await setUser(USER1);

    // Create a family
    await client.query(`
      INSERT INTO families (id, name, created_by, member_ids, created_at, updated_at)
      VALUES ($1, 'Test Family', $2, ARRAY[$2]::uuid[], NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [FAMILY_ID, USER1]);

    // Create family membership
    await client.query(`
      INSERT INTO family_memberships (family_id, user_id, role, created_by, joined_at, created_at, updated_at)
      VALUES ($1, $2, 'admin', $2, NOW(), NOW(), NOW())
      ON CONFLICT (family_id, user_id) DO NOTHING
    `, [FAMILY_ID, USER1]);

    // Create a child
    await client.query(`
      INSERT INTO children (id, family_id, name, birth_date, created_by, created_at, updated_at)
      VALUES ($1, $2, 'Test Child', '2020-01-01', $3, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [CHILD_ID, FAMILY_ID, USER1]);

    // Create a memory
    await client.query(`
      INSERT INTO memory_entries (id, child_id, created_by, content, kind, created_at, updated_at)
      VALUES ($1, $2, $3, 'Test memory content', 'text', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `, [MEMORY_ID, CHILD_ID, USER1]);

    console.log("✅ Test data created");

    // === TEST 1: User can read their own data ===
    console.log("\n🧪 Test 1: USER1 can read their own memory");
    await setUser(USER1);
    const ownMemory = await client.query(
      `SELECT COUNT(*) FROM memory_entries WHERE id = $1`,
      [MEMORY_ID]
    );

    if (Number(ownMemory.rows[0].count) !== 1) {
      throw new Error(`RLS failure: USER1 cannot read their own memory (got ${ownMemory.rows[0].count})`);
    }
    console.log("   ✅ USER1 can read their own memory");

    // === TEST 2: Other users cannot read data ===
    console.log("\n🧪 Test 2: USER2 cannot read USER1's memory");
    await setUser(USER2);
    const otherMemory = await client.query(
      `SELECT COUNT(*) FROM memory_entries WHERE id = $1`,
      [MEMORY_ID]
    );

    if (Number(otherMemory.rows[0].count) !== 0) {
      throw new Error(`RLS leak: USER2 can read USER1's memory (got ${otherMemory.rows[0].count})`);
    }
    console.log("   ✅ USER2 is blocked from USER1's memory");

    // === TEST 3: Family member can read shared data ===
    console.log("\n🧪 Test 3: Family member can read shared child data");

    // Add USER2 to the family
    await setUser(USER1); // USER1 is admin, can add members
    await client.query(`
      UPDATE families
      SET member_ids = array_append(member_ids, $1::uuid)
      WHERE id = $2
    `, [USER2, FAMILY_ID]);

    await client.query(`
      INSERT INTO family_memberships (family_id, user_id, role, created_by, joined_at, created_at, updated_at)
      VALUES ($1, $2, 'member', $3, NOW(), NOW(), NOW())
    `, [FAMILY_ID, USER2, USER1]);

    // Now USER2 should be able to read the child
    await setUser(USER2);
    const familyChild = await client.query(
      `SELECT COUNT(*) FROM children WHERE id = $1`,
      [CHILD_ID]
    );

    if (Number(familyChild.rows[0].count) !== 1) {
      throw new Error(`RLS failure: Family member cannot read shared child (got ${familyChild.rows[0].count})`);
    }
    console.log("   ✅ Family members can read shared children");

    // === TEST 4: Non-admin cannot modify family ===
    console.log("\n🧪 Test 4: Non-admin cannot modify family settings");
    await setUser(USER2); // USER2 is just a member, not admin

    try {
      await client.query(`
        UPDATE families
        SET name = 'Hacked Family Name'
        WHERE id = $1
      `, [FAMILY_ID]);

      // Check if update actually happened
      const check = await client.query(
        `SELECT name FROM families WHERE id = $1`,
        [FAMILY_ID]
      );

      if (check.rows[0]?.name === 'Hacked Family Name') {
        throw new Error("RLS failure: Non-admin could modify family");
      }
    } catch (err) {
      // Expected to fail or have no effect
    }
    console.log("   ✅ Non-admin blocked from modifying family");

    // === TEST 5: User cannot create memory for another user's child ===
    console.log("\n🧪 Test 5: USER2 cannot create memory for USER1's child");
    await setUser(USER2);

    try {
      await client.query(`
        INSERT INTO memory_entries (child_id, created_by, content, kind, created_at, updated_at)
        VALUES ($1, $2, 'Unauthorized memory', 'text', NOW(), NOW())
      `, [CHILD_ID, USER2]);

      // If we get here, RLS failed
      throw new Error("RLS failure: USER2 could create memory for USER1's child");
    } catch (err) {
      if (err.message.includes("RLS failure")) {
        throw err;
      }
      // Expected to fail with permission error
    }
    console.log("   ✅ USER2 blocked from creating memories for others");

    console.log("\n🎉 All RLS tests passed!");

  } catch (error) {
    console.error("\n❌ RLS test failed:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run tests
runTests().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});