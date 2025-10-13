"use server"

import { signIn, signUp, createAdminUser, signOutServerAction, updatePassword } from "./auth"
import {
  inviteUser,
  approveUserServerAction,
  rejectUserServerAction,
  updatePendingUserFields,
  updateUserFields,
  deleteUserCompletely,
  updateProfile,
  fetchPendingUsers,
  fetchUnconfirmedEmailUsers,
  resendConfirmationEmail,
  adminResetUserPassword,
} from "./users"
import { incrementVideoViews, saveVideo } from "./videos"
import { addPerformer, updatePerformer, deletePerformer } from "./performers"
import { fetchNotificationsWithSenders, sendNotificationWithEmail } from "./notifications"
import { getTelemetryData, clearAuthDebugLogs, fetchAuthDebugLogs } from "./admin"
import { logAuditEvent, fetchAuditLogs, clearAuditLogs } from "./audit"

export {
  signIn,
  signUp,
  createAdminUser,
  signOutServerAction,
  updatePassword,
  inviteUser,
  approveUserServerAction,
  rejectUserServerAction,
  updatePendingUserFields,
  updateUserFields,
  deleteUserCompletely,
  updateProfile,
  fetchPendingUsers,
  fetchUnconfirmedEmailUsers,
  resendConfirmationEmail,
  adminResetUserPassword,
  incrementVideoViews,
  saveVideo,
  addPerformer,
  updatePerformer,
  deletePerformer,
  fetchNotificationsWithSenders,
  sendNotificationWithEmail,
  getTelemetryData,
  clearAuthDebugLogs,
  fetchAuthDebugLogs,
  logAuditEvent,
  fetchAuditLogs,
  clearAuditLogs,
}
