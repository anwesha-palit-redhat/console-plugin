import { ApproverInput, ApproverResponse } from './approvals';

export type UserApprover = {
  input: ApproverInput;
  name: string;
};

export type Approver = {
  input: ApproverInput;
  message?: string;
  name: string;
  type: 'User' | 'Group';
  isGroup?: boolean;
  groupUsers?: UserApprover[];
};
export type GroupMember = {
  name: string;
  response: ApproverResponse;
  message?: string;
};

export type ApproverResponseDetails = {
  name: string;
  response: ApproverResponse;
  type: 'User' | 'Group';
  message?: string;
  groupMembers?: GroupMember[];
};
