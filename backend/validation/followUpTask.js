const TASK_PRIORITIES = ['low', 'medium', 'high'];
const TASK_STATUSES = ['open', 'in_progress', 'resolved'];

const ALLOWED_STATUS_TRANSITIONS = {
  open: ['in_progress', 'resolved'],
  in_progress: ['open', 'resolved'],
  resolved: ['open'],
};

function getTrimmedString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getOptionalTrimmedString(value) {
  return value === undefined ? undefined : getTrimmedString(value);
}

function parseDueAt(value) {
  const dueAt = new Date(value);
  return Number.isNaN(dueAt.getTime()) ? null : dueAt;
}

function parseVersion(value) {
  const version = Number(value);
  return Number.isInteger(version) && version > 0 ? version : null;
}

function validateTextField(errors, value, field, { required = false, maxLength }) {
  if (required && !value) {
    errors.push(`${field} is required.`);
  }

  if (value && value.length > maxLength) {
    errors.push(`${field} must not exceed ${maxLength} characters.`);
  }
}

function validateDueAt(errors, value, now) {
  const dueAt = parseDueAt(value);

  if (!dueAt) {
    errors.push('due_at must be a valid date and time.');
  } else if (dueAt <= now) {
    errors.push('due_at must be in the future.');
  }

  return dueAt;
}

function validateCreateFollowUpTaskPayload(body = {}, { now = new Date() } = {}) {
  const errors = [];
  const value = {
    cid: getTrimmedString(body.cid),
    assignee_eid: getTrimmedString(body.assignee_eid),
    title: getTrimmedString(body.title),
    description: getTrimmedString(body.description),
    priority: getTrimmedString(body.priority || 'medium').toLowerCase(),
    due_at: validateDueAt(errors, body.due_at, now),
  };

  validateTextField(errors, value.cid, 'cid', { required: true, maxLength: 120 });
  validateTextField(errors, value.assignee_eid, 'assignee_eid', { required: true, maxLength: 120 });
  validateTextField(errors, value.title, 'title', { required: true, maxLength: 160 });
  validateTextField(errors, value.description, 'description', { maxLength: 2000 });

  if (!TASK_PRIORITIES.includes(value.priority)) {
    errors.push(`priority must be one of: ${TASK_PRIORITIES.join(', ')}.`);
  }

  return { errors, value };
}

function validateFollowUpTaskUpdatePayload(body = {}, { now = new Date() } = {}) {
  const errors = [];
  const value = {};
  const editableFields = ['assignee_eid', 'title', 'description', 'priority', 'due_at'];
  const suppliedFields = editableFields.filter((field) => body[field] !== undefined);

  if (suppliedFields.length === 0) {
    errors.push('At least one editable field is required.');
  }

  if (body.assignee_eid !== undefined) {
    value.assignee_eid = getOptionalTrimmedString(body.assignee_eid);
    validateTextField(errors, value.assignee_eid, 'assignee_eid', { required: true, maxLength: 120 });
  }

  if (body.title !== undefined) {
    value.title = getOptionalTrimmedString(body.title);
    validateTextField(errors, value.title, 'title', { required: true, maxLength: 160 });
  }

  if (body.description !== undefined) {
    value.description = getOptionalTrimmedString(body.description);
    validateTextField(errors, value.description, 'description', { maxLength: 2000 });
  }

  if (body.priority !== undefined) {
    value.priority = getOptionalTrimmedString(body.priority).toLowerCase();
    if (!TASK_PRIORITIES.includes(value.priority)) {
      errors.push(`priority must be one of: ${TASK_PRIORITIES.join(', ')}.`);
    }
  }

  if (body.due_at !== undefined) {
    value.due_at = validateDueAt(errors, body.due_at, now);
  }

  value.version = parseVersion(body.version);
  if (!value.version) {
    errors.push('version must be a positive integer.');
  }

  return { errors, value };
}

function validateFollowUpStatusUpdatePayload(body = {}) {
  const errors = [];
  const value = {
    status: getTrimmedString(body.status).toLowerCase(),
    resolution_note: getTrimmedString(body.resolution_note),
    version: parseVersion(body.version),
  };

  if (!TASK_STATUSES.includes(value.status)) {
    errors.push(`status must be one of: ${TASK_STATUSES.join(', ')}.`);
  }

  validateTextField(errors, value.resolution_note, 'resolution_note', { maxLength: 2000 });

  if (value.status === 'resolved' && !value.resolution_note) {
    errors.push('resolution_note is required when resolving a task.');
  }

  if (!value.version) {
    errors.push('version must be a positive integer.');
  }

  return { errors, value };
}

function isAllowedStatusTransition(currentStatus, nextStatus) {
  return ALLOWED_STATUS_TRANSITIONS[currentStatus]?.includes(nextStatus) || false;
}

module.exports = {
  TASK_PRIORITIES,
  TASK_STATUSES,
  isAllowedStatusTransition,
  validateCreateFollowUpTaskPayload,
  validateFollowUpStatusUpdatePayload,
  validateFollowUpTaskUpdatePayload,
};
