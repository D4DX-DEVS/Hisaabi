const { Group, User } = require('../models');

function generateGroupId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = '';
  for (let i = 0; i < 6; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

async function generateUniqueGroupId() {
  let id;
  let exists = true;
  while (exists) {
    id = generateGroupId();
    exists = !!(await Group.findOne({ group_id: id }));
  }
  return id;
}

function isGroupAdmin(group, userId) {
  const uid = userId.toString();
  return (
    group.admin_id.toString() === uid ||
    (group.co_admins || []).some((id) => id.toString() === uid)
  );
}

function formatGroup(group, adminUser, currentUserId) {
  return {
    id: group._id,
    name: group.name,
    group_id: group.group_id,
    admin: adminUser
      ? { id: adminUser._id, name: adminUser.name, email: adminUser.email }
      : null,
    users: group.users,
    co_admins: (group.co_admins || []).map((id) => id.toString()),
    is_admin: isGroupAdmin(group, currentUserId),
    created_at: group.created_at,
  };
}

async function createGroup(req, res, next) {
  try {
    const userId = req.user._id;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Group name is required' });

    const group_id = await generateUniqueGroupId();
    const group = await Group.create({
      name,
      group_id,
      admin_id: userId,
      users: [userId],
    });

    return res.status(201).json({
      id: group._id,
      name: group.name,
      group_id: group.group_id,
      admin: { id: req.user._id, name: req.user.name, email: req.user.email },
      users: group.users,
      created_at: group.created_at,
    });
  } catch (err) {
    next(err);
  }
}

async function joinGroupByCode(req, res, next) {
  try {
    const userId = req.user._id;
    const { group_id } = req.body;
    if (!group_id) return res.status(400).json({ error: 'Group ID is required' });

    const group = await Group.findOne({ group_id });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isMember = group.users.some((u) => u.toString() === userId.toString());
    if (isMember) return res.status(400).json({ error: 'You are already a member of this group' });

    group.users.push(userId);
    await group.save();

    const admin = await User.findById(group.admin_id);
    return res.status(200).json({
      id: group._id,
      name: group.name,
      group_id: group.group_id,
      admin: admin ? { id: admin._id, name: admin.name, email: admin.email } : null,
      users: group.users,
      joined_at: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

async function getMyGroups(req, res, next) {
  try {
    const userId = req.user._id;
    const groups = await Group.find({ users: userId });

    const result = await Promise.all(
      groups.map(async (g) => {
        const admin = await User.findById(g.admin_id);
        return formatGroup(g, admin, userId);
      })
    );

    return res.status(200).json({ groups: result });
  } catch (err) {
    next(err);
  }
}

async function leaveGroup(req, res, next) {
  try {
    const userId = req.user._id;
    const { group_id } = req.body;

    const group = await Group.findOne({ group_id });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isMember = group.users.some((u) => u.toString() === userId.toString());
    if (!isMember) return res.status(403).json({ error: 'You are not a member of this group' });

    if (group.admin_id.toString() === userId.toString()) {
      return res.status(403).json({ error: 'Group admin cannot leave the group' });
    }

    group.users = group.users.filter((u) => u.toString() !== userId.toString());
    group.co_admins = (group.co_admins || []).filter((id) => id.toString() !== userId.toString());
    await group.save();

    const admin = await User.findById(group.admin_id);
    return res.status(200).json({
      id: group._id,
      name: group.name,
      group_id: group.group_id,
      admin: admin ? { id: admin._id, name: admin.name, email: admin.email } : null,
      users: group.users,
      left_at: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

async function getGroupMembers(req, res, next) {
  try {
    const { group_id } = req.params;
    const group = await Group.findOne({ group_id });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const members = await User.find({ _id: { $in: group.users } });
    const admin = await User.findById(group.admin_id);

    return res.status(200).json({
      id: group._id,
      name: group.name,
      group_id: group.group_id,
      admin: admin ? { id: admin._id, name: admin.name, email: admin.email } : null,
      co_admins: (group.co_admins || []).map((id) => id.toString()),
      members: members.map((m) => ({ id: m._id, name: m.name, email: m.email })),
    });
  } catch (err) {
    next(err);
  }
}

async function deleteGroup(req, res, next) {
  try {
    const userId = req.user._id;
    const { group_id } = req.params;

    const group = await Group.findOne({ group_id });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (group.admin_id.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only group admin can delete the group' });
    }

    await group.deleteOne();
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function transferAdmin(req, res, next) {
  try {
    const userId = req.user._id;
    const { group_id } = req.params;
    const { new_admin_id } = req.body;

    if (!new_admin_id) return res.status(400).json({ error: 'new_admin_id is required' });

    const group = await Group.findOne({ group_id });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (!isGroupAdmin(group, userId)) {
      return res.status(403).json({ error: 'Only group admin can grant admin privileges' });
    }

    if (new_admin_id === userId.toString()) {
      return res.status(400).json({ error: 'You are already an admin' });
    }

    const isMember = group.users.some((u) => u.toString() === new_admin_id);
    if (!isMember) return res.status(400).json({ error: 'Target user is not a member of this group' });

    if (isGroupAdmin(group, new_admin_id)) {
      return res.status(400).json({ error: 'This user is already an admin' });
    }

    group.co_admins = group.co_admins || [];
    group.co_admins.push(new_admin_id);
    await group.save();

    const newAdmin = await User.findById(new_admin_id);
    return res.status(200).json({
      id: group._id,
      name: group.name,
      group_id: group.group_id,
      admin: newAdmin ? { id: newAdmin._id, name: newAdmin.name, email: newAdmin.email } : null,
      users: group.users,
    });
  } catch (err) {
    next(err);
  }
}

async function removeMember(req, res, next) {
  try {
    const userId = req.user._id;
    const { group_id, user_id } = req.params;

    const group = await Group.findOne({ group_id });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Only the primary owner can remove members
    if (group.admin_id.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only the group owner can remove members' });
    }

    if (user_id === userId.toString()) {
      return res.status(400).json({ error: 'Owner cannot remove themselves' });
    }

    const isMember = group.users.some((u) => u.toString() === user_id);
    if (!isMember) return res.status(400).json({ error: 'User is not a member of this group' });

    group.users = group.users.filter((u) => u.toString() !== user_id);
    group.co_admins = (group.co_admins || []).filter((id) => id.toString() !== user_id);
    await group.save();

    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function revokeAdmin(req, res, next) {
  try {
    const userId = req.user._id;
    const { group_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) return res.status(400).json({ error: 'user_id is required' });

    const group = await Group.findOne({ group_id });
    if (!group) return res.status(404).json({ error: 'Group not found' });

    // Only the primary owner can revoke admin
    if (group.admin_id.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Only the group owner can revoke admin privileges' });
    }

    const isCoAdmin = (group.co_admins || []).some((id) => id.toString() === user_id);
    if (!isCoAdmin) return res.status(400).json({ error: 'This user is not a co-admin' });

    group.co_admins = group.co_admins.filter((id) => id.toString() !== user_id);
    await group.save();

    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = { createGroup, joinGroupByCode, getMyGroups, leaveGroup, getGroupMembers, deleteGroup, transferAdmin, removeMember, revokeAdmin };
