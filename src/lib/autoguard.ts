import { prisma } from "./db";

export interface AutoGuardResult {
  triggered: boolean;
  connectionId: string;
  contactName: string;
  message: string;
  auditLogId?: string;
}

/**
 * AutoGuard kill-switch: when a connection status changes to RESPONDED,
 * pause automation and log an audit event.
 */
export async function triggerAutoGuard(
  connectionId: string,
  userId: string,
): Promise<AutoGuardResult> {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    include: { alumni: true },
  });

  if (!connection || connection.userId !== userId) {
    return {
      triggered: false,
      connectionId,
      contactName: "",
      message: "Connection not found",
    };
  }

  // Update status to RESPONDED and pause automation
  await prisma.connection.update({
    where: { id: connectionId },
    data: {
      status: "RESPONDED",
      automationPaused: true,
    },
  });

  // Create audit log entry
  const auditLog = await prisma.auditLog.create({
    data: {
      userId,
      contactId: connection.alumniId,
      action: "AUTOGUARD_TRIGGERED",
      detail: `Automation paused — ${connection.alumni.name} responded`,
    },
  });

  return {
    triggered: true,
    connectionId,
    contactName: connection.alumni.name,
    message: `${connection.alumni.name} responded — automation paused`,
    auditLogId: auditLog.id,
  };
}

/**
 * Re-enable automation for a connection after explicit user action.
 */
export async function resumeAutomation(
  connectionId: string,
  userId: string,
): Promise<{ resumed: boolean; message: string; auditLogId?: string }> {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    include: { alumni: true },
  });

  if (!connection || connection.userId !== userId) {
    return { resumed: false, message: "Connection not found" };
  }

  if (!connection.automationPaused) {
    return { resumed: false, message: "Automation is not paused" };
  }

  await prisma.connection.update({
    where: { id: connectionId },
    data: { automationPaused: false },
  });

  const auditLog = await prisma.auditLog.create({
    data: {
      userId,
      contactId: connection.alumniId,
      action: "AUTOMATION_RESUMED",
      detail: `User manually resumed automation for ${connection.alumni.name}`,
    },
  });

  return {
    resumed: true,
    message: `Automation resumed for ${connection.alumni.name}`,
    auditLogId: auditLog.id,
  };
}

/**
 * Check whether automation is allowed for a connection.
 * Returns false if status is RESPONDED and automation is paused.
 */
export function isAutomationAllowed(connection: {
  status: string;
  automationPaused: boolean;
}): boolean {
  return !connection.automationPaused;
}
