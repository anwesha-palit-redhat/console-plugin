import { K8sResourceCommon } from '@openshift-console/dynamic-plugin-sdk';
import { ApproverInput, ApproverResponse } from './approvals';
import { TektonTaskSpec } from './coreTekton';

export type TaskKind = K8sResourceCommon & {
  spec: TektonTaskSpec;
};

export type SelectedBuilderTask = {
  resource: TaskKind;
  taskIndex: number;
  isFinallyTask: boolean;
};

export type CustomRunKind = K8sResourceCommon & {
  spec: {
    customRef: {
      apiVersion: string;
      kind: string;
    };
    params: {
      name: any;
      value: any;
    }[];
    serviceAccountName?: string;
  };
};

export type UserApprover = {
  input: ApproverInput;
  name: string;
};

export type Approver = {
  input: ApproverInput;
  message?: string;
  name: string;
  type: 'User' | 'Group';
  users?: UserApprover[];
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
export type ApprovalTaskKind = K8sResourceCommon & {
  spec?: {
    approvers: Approver[];
    // {
    //   input: ApproverInput;
    //   message?: string;
    //   name: string;
    //   type: 'User' | 'Group';
    //   users?: {
    //     nput: ApproverInput;
    //     name: string;
    //   }[];
    // }[];
    numberOfApprovalsRequired: number;
    description?: string;
  };

  status?: {
    state: ApproverResponse;
    approvalsReceived?: number;
    approvalsRequired?: number;
    approvers: string[];
    approversResponse?: ApproverResponseDetails[];
    //  {
    //   name: string;
    //   response: ApproverResponse;
    //   type: 'User' | 'Group';
    //   message?: string;
    //   groupMembers?: {
    //     name: string;
    //     response: ApproverResponse;
    //     message?: string;
    //   }[];
    // }
    // [];
  };
};
