const { GroupActivity, Group, User } = require('../models');
const ExcelJS = require('exceljs');

const VALID_ACTIVITY_TYPES = ['daily', 'weekly', 'monthly', 'recurring'];

function isGroupAdmin(group, userId) {
  const uid = userId.toString();
  return (
    group.admin_id.toString() === uid ||
    (group.co_admins || []).some((id) => id.toString() === uid)
  );
}

async function createGroupActivity(req, res, next) {
  try {
    const userId = req.user._id;
    const { group_id, activity_type, activity_name, description, date } = req.body;

    if (!group_id || !activity_type || !activity_name || !date) {
      return res.status(400).json({ error: 'group_id, activity_type, activity_name, and date are required' });
    }

    const group = await Group.findById(group_id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (!isGroupAdmin(group, userId)) {
      return res.status(403).json({ error: 'Only group admin can create activities' });
    }

    if (!VALID_ACTIVITY_TYPES.includes(activity_type)) {
      return res.status(400).json({ error: `activity_type must be one of: ${VALID_ACTIVITY_TYPES.join(', ')}` });
    }

    // Initialize user_status for all members
    const user_status = group.users.map((u) => ({
      user: u,
      status: '',
      updatedAt: null,
    }));

    const activity = await GroupActivity.create({
      group_id,
      activity_type,
      activity_name,
      description: description || null,
      date: new Date(date),
      user_status,
    });

    return res.status(201).json({
      id: activity._id,
      group_id: activity.group_id,
      activity_type: activity.activity_type,
      activity_name: activity.activity_name,
      description: activity.description,
      date: activity.date,
      user_status: activity.user_status,
      created_at: activity.created_at,
    });
  } catch (err) {
    next(err);
  }
}

async function getGroupActivities(req, res, next) {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isMember = group.users.some((u) => u.toString() === userId.toString());
    if (!isMember) return res.status(403).json({ error: 'You are not a member of this group' });

    const isAdmin = isGroupAdmin(group, userId);
    const activities = await GroupActivity.find({ group_id: groupId }).sort({ date: -1 });

    const formattedActivities = activities.map((a) => {
      let user_status = a.user_status;
      if (!isAdmin) {
        user_status = user_status.filter((s) => s.user && s.user.toString() === userId.toString());
      }
      return {
        id: a._id,
        group_id: a.group_id,
        activity_type: a.activity_type,
        activity_name: a.activity_name,
        description: a.description,
        date: a.date,
        user_status,
        created_at: a.created_at,
      };
    });

    return res.status(200).json({
      activities: formattedActivities,
      is_admin: isAdmin,
      co_admins: (group.co_admins || []).map((id) => id.toString()),
    });
  } catch (err) {
    next(err);
  }
}

async function updateMyActivityStatus(req, res, next) {
  try {
    const userId = req.user._id;
    const { activityId } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required' });

    const activity = await GroupActivity.findById(activityId);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });

    const group = await Group.findById(activity.group_id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const isMember = group.users.some((u) => u.toString() === userId.toString());
    if (!isMember) return res.status(403).json({ error: 'You are not a member of this group' });

    const userStatuses = activity.user_status || [];
    const idx = userStatuses.findIndex((s) => s.user && s.user.toString() === userId.toString());

    const updatedStatus = { user: userId, status, updatedAt: new Date().toISOString() };
    if (idx !== -1) {
      userStatuses[idx] = updatedStatus;
    } else {
      userStatuses.push(updatedStatus);
    }

    activity.user_status = userStatuses;
    activity.markModified('user_status');
    await activity.save();

    return res.status(200).json({
      id: activity._id,
      activity_name: activity.activity_name,
      my_status: updatedStatus,
    });
  } catch (err) {
    next(err);
  }
}

async function editGroupActivity(req, res, next) {
  try {
    const userId = req.user._id;
    const { activityId } = req.params;
    const { activity_type, activity_name, description, date } = req.body;

    if (!activity_type && !activity_name && !description && !date) {
      return res.status(400).json({ error: 'At least one field is required to update' });
    }

    const activity = await GroupActivity.findById(activityId);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });

    const group = await Group.findById(activity.group_id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (!isGroupAdmin(group, userId)) {
      return res.status(403).json({ error: 'Only group admin can edit activities' });
    }

    if (activity_type) {
      if (!VALID_ACTIVITY_TYPES.includes(activity_type)) {
        return res.status(400).json({ error: 'Invalid activity type' });
      }
      activity.activity_type = activity_type;
    }
    if (activity_name !== undefined) {
      if (!activity_name) return res.status(400).json({ error: 'Activity name is required' });
      activity.activity_name = activity_name;
    }
    if (description !== undefined) activity.description = description;
    if (date) {
      const d = new Date(date);
      if (isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid date' });
      activity.date = d;
    }

    await activity.save();

    return res.status(200).json({
      id: activity._id,
      group_id: activity.group_id,
      activity_type: activity.activity_type,
      activity_name: activity.activity_name,
      description: activity.description,
      date: activity.date,
      user_status: activity.user_status,
      created_at: activity.created_at,
    });
  } catch (err) {
    next(err);
  }
}

async function deleteGroupActivity(req, res, next) {
  try {
    const userId = req.user._id;
    const { activityId } = req.params;

    const activity = await GroupActivity.findById(activityId);
    if (!activity) return res.status(404).json({ error: 'Activity not found' });

    const group = await Group.findById(activity.group_id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (!isGroupAdmin(group, userId)) {
      return res.status(403).json({ error: 'Only group admin can delete activities' });
    }

    await activity.deleteOne();
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

async function exportGroupActivities(req, res, next) {
  try {
    const userId = req.user._id;
    const { groupId } = req.params;

    const group = await Group.findById(groupId);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    if (!isGroupAdmin(group, userId)) {
      return res.status(403).json({ error: 'Only group admin can export activities' });
    }

    const activities = await GroupActivity.find({ group_id: groupId }).sort({ date: -1 });

    // Get all member IDs from group users list and activity statuses
    const allMemberIds = [...new Set([
      ...group.users.map((u) => u.toString()),
      ...activities.flatMap((a) => (a.user_status || []).map((s) => s.user?.toString()).filter(Boolean)),
    ])];
    const members = await User.find({ _id: { $in: allMemberIds } }).select('name email');
    const memberMap = {};
    members.forEach((m) => { memberMap[m._id.toString()] = m.name || m.email || 'Unknown'; });

    const adminName = memberMap[group.admin_id.toString()] || 'Unknown';

    const workbook = new ExcelJS.Workbook();

    // --- Sheet 1: Group Summary ---
    const summarySheet = workbook.addWorksheet('Group Summary');
    summarySheet.columns = [
      { header: 'Field', key: 'field', width: 25 },
      { header: 'Value', key: 'value', width: 35 },
    ];
    summarySheet.getRow(1).font = { bold: true };
    summarySheet.addRow({ field: 'Group Name', value: group.name });
    summarySheet.addRow({ field: 'Group Code', value: group.group_id });
    summarySheet.addRow({ field: 'Admin', value: adminName });
    summarySheet.addRow({ field: 'Total Members', value: group.users.length });
    summarySheet.addRow({ field: 'Total Activities', value: activities.length });
    summarySheet.addRow({ field: 'Created At', value: group.createdAt ? new Date(group.createdAt).toLocaleDateString() : '' });
    summarySheet.addRow({ field: 'Export Date', value: new Date().toLocaleString() });

    // --- Sheet 2: Activity Log (detailed) ---
    const logSheet = workbook.addWorksheet('Activity Log');
    logSheet.columns = [
      { header: 'Activity Name', key: 'activity_name', width: 25 },
      { header: 'Type', key: 'activity_type', width: 12 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Member Name', key: 'member_name', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Updated At', key: 'updated_at', width: 22 },
    ];
    logSheet.getRow(1).font = { bold: true };

    for (const activity of activities) {
      for (const us of (activity.user_status || [])) {
        logSheet.addRow({
          activity_name: activity.activity_name,
          activity_type: activity.activity_type,
          date: activity.date ? new Date(activity.date).toLocaleDateString() : '',
          member_name: memberMap[us.user?.toString()] || 'Unknown',
          status: us.status || 'Not responded',
          updated_at: us.updatedAt ? new Date(us.updatedAt).toLocaleString() : '',
        });
      }
    }

    // --- Sheet 3: Member Statistics ---
    const statsSheet = workbook.addWorksheet('Member Statistics');
    statsSheet.columns = [
      { header: 'Member Name', key: 'member_name', width: 22 },
      { header: 'Total Activities', key: 'total', width: 16 },
      { header: 'Completed', key: 'completed', width: 14 },
      { header: 'Pending', key: 'pending', width: 14 },
      { header: 'Not Responded', key: 'not_responded', width: 16 },
      { header: 'Completion Rate', key: 'completion_rate', width: 16 },
    ];
    statsSheet.getRow(1).font = { bold: true };

    // Calculate per-member stats
    const memberStats = {};
    for (const memberId of allMemberIds) {
      memberStats[memberId] = { total: 0, completed: 0, pending: 0, not_responded: 0 };
    }

    for (const activity of activities) {
      for (const memberId of allMemberIds) {
        const userEntry = (activity.user_status || []).find(
          (s) => s.user && s.user.toString() === memberId
        );
        memberStats[memberId].total++;
        if (!userEntry || !userEntry.status) {
          memberStats[memberId].not_responded++;
        } else if (userEntry.status === 'completed' || userEntry.status === 'done') {
          memberStats[memberId].completed++;
        } else {
          memberStats[memberId].pending++;
        }
      }
    }

    for (const memberId of allMemberIds) {
      const stats = memberStats[memberId];
      const rate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) + '%' : '0%';
      statsSheet.addRow({
        member_name: memberMap[memberId] || 'Unknown',
        total: stats.total,
        completed: stats.completed,
        pending: stats.pending,
        not_responded: stats.not_responded,
        completion_rate: rate,
      });
    }

    // --- Sheet 4: Activity Statistics ---
    const activityStatsSheet = workbook.addWorksheet('Activity Statistics');
    activityStatsSheet.columns = [
      { header: 'Activity Name', key: 'activity_name', width: 25 },
      { header: 'Type', key: 'activity_type', width: 12 },
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Total Members', key: 'total_members', width: 15 },
      { header: 'Completed', key: 'completed', width: 14 },
      { header: 'Pending', key: 'pending', width: 14 },
      { header: 'Not Responded', key: 'not_responded', width: 16 },
      { header: 'Completion Rate', key: 'completion_rate', width: 16 },
    ];
    activityStatsSheet.getRow(1).font = { bold: true };

    for (const activity of activities) {
      const statuses = activity.user_status || [];
      const totalMembers = allMemberIds.length;
      let completed = 0;
      let pending = 0;

      for (const memberId of allMemberIds) {
        const userEntry = statuses.find((s) => s.user && s.user.toString() === memberId);
        if (userEntry && (userEntry.status === 'completed' || userEntry.status === 'done')) {
          completed++;
        } else if (userEntry && userEntry.status) {
          pending++;
        }
      }
      const notResponded = totalMembers - completed - pending;
      const rate = totalMembers > 0 ? ((completed / totalMembers) * 100).toFixed(1) + '%' : '0%';

      activityStatsSheet.addRow({
        activity_name: activity.activity_name,
        activity_type: activity.activity_type,
        date: activity.date ? new Date(activity.date).toLocaleDateString() : '',
        total_members: totalMembers,
        completed,
        pending,
        not_responded: notResponded,
        completion_rate: rate,
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${group.name}_activities_export.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createGroupActivity,
  getGroupActivities,
  updateMyActivityStatus,
  editGroupActivity,
  deleteGroupActivity,
  exportGroupActivities,
};
