import { k8sGet } from '@openshift-console/dynamic-plugin-sdk';
import { Approver } from 'src/types';
import { GroupModel } from '../../models';

export interface GroupKind {
  metadata: {
    name: string;
  };
  users?: string[];
}

/**
 * Checks if the current user is authorized based on approvers list
 * Supports both direct user assignment and group membership (group:groupname format)
 * @param currentUser - The current user's username
 * @param approvers - Array of approver strings (usernames or group:groupname)
 * @returns Promise resolving to true if user is authorized
 */
export const isUserAuthorizedForApproval = async (
  currentUser: string,
  approvers: Approver[],
): Promise<boolean> => {
  if (!currentUser || !approvers || approvers.length === 0) {
    return false;
  }

  // Check direct user assignment (existing functionality)
  if (
    approvers.some(
      (approver) => approver.name === currentUser && approver.type === 'User',
    )
  ) {
    return true;
  }

  // Check group-based assignments (new functionality)
  const groupApprovers = approvers.filter(
    (approver) => approver.type === 'Group',
  );

  for (const groupApprover of groupApprovers) {
    const groupName = groupApprover.name;
    try {
      const group = await k8sGet<GroupKind>({
        model: GroupModel,
        name: groupName,
      });
      if (group.users && group.users.includes(currentUser)) {
        return true;
      }
    } catch (error) {
      // Log error but continue checking other groups
      console.warn(
        `Failed to check group membership for group: ${groupName}`,
        error,
      );
    }
  }

  return false;
};
