import { t_temp_dev_tbd as almostApprovedColor /* CODEMODS: you should update this color token, original v5 token was global_active_color_100 */ } from "@patternfly/react-tokens/dist/js/t_temp_dev_tbd";
import { t_temp_dev_tbd as partiallyApprovedColor /* CODEMODS: you should update this color token, original v5 token was global_active_color_400 */ } from "@patternfly/react-tokens/dist/js/t_temp_dev_tbd";
import { t_temp_dev_tbd as waitColor /* CODEMODS: you should update this color token, original v5 token was global_palette_black_500 */ } from "@patternfly/react-tokens/dist/js/t_temp_dev_tbd";
import { t_temp_dev_tbd as approveColor /* CODEMODS: you should update this color token, original v5 token was global_palette_green_500 */ } from "@patternfly/react-tokens/dist/js/t_temp_dev_tbd";
import { t_temp_dev_tbd as rejectColor /* CODEMODS: you should update this color token, original v5 token was global_palette_red_100 */ } from "@patternfly/react-tokens/dist/js/t_temp_dev_tbd";
import { ApprovalFields, ApprovalLabels } from '../../consts';
import {
  ApprovalStatus,
  ApprovalTaskKind,
  ApproverStatusResponse,
  ComputedStatus,
  PipelineRunKind,
} from '../../types';
import { t } from './common-utils';
import { StatusMessage } from './pipeline-augment';
import { pipelineRunFilterReducer } from './pipeline-filter-reducer';

export const getApprovalStatusInfo = (status: string): StatusMessage => {
  switch (status) {
    case ApprovalStatus.Idle:
      return {
        message: t('Waiting'),
        pftoken: waitColor,
      };
    case ApprovalStatus.RequestSent:
      return {
        message: t('Pending'),
        pftoken: waitColor,
      };
    case ApprovalStatus.PartiallyApproved:
      return {
        message: t('Partially approved'),
        pftoken: partiallyApprovedColor,
      };
    case ApprovalStatus.AlmostApproved:
      return {
        message: t('Partially approved'),
        pftoken: almostApprovedColor,
      };
    case ApprovalStatus.Accepted:
      return {
        message: t('Approved'),
        pftoken: approveColor,
      };
    case ApprovalStatus.Rejected:
      return {
        message: t('Rejected'),
        pftoken: rejectColor,
      };
    case ApprovalStatus.TimedOut:
      return {
        message: t('Timed out'),
        pftoken: waitColor,
      };
    case ApprovalStatus.Unknown:
    default:
      return {
        message: t('Unknown'),
        pftoken: waitColor,
      };
  }
};

export const getApprovalStatus = (
  approvalTask: ApprovalTaskKind,
  pipelineRun: PipelineRunKind,
): ApprovalStatus => {
  const pipelineRunStatus =
    pipelineRun && pipelineRunFilterReducer(pipelineRun);

  const approvalsRequired = approvalTask?.spec?.numberOfApprovalsRequired;
  const currentApprovals = approvalTask?.status?.approvalsReceived;
  const approvalState = approvalTask?.status?.state;
  const approvalPercentage = (currentApprovals / approvalsRequired) * 100;

  if (pipelineRunStatus === ComputedStatus.Running) {
    if (!approvalState) {
      return ApprovalStatus.Idle;
    }
    if (approvalState === ApprovalStatus.RequestSent) {
      if (!approvalPercentage) {
        return ApprovalStatus.RequestSent;
      }
      return approvalPercentage >= 75
        ? ApprovalStatus.AlmostApproved
        : ApprovalStatus.PartiallyApproved;
    }
  }

  if (approvalState === ApproverStatusResponse.Accepted) {
    return ApprovalStatus.Accepted;
  }
  if (approvalState === ApproverStatusResponse.Rejected) {
    return ApprovalStatus.Rejected;
  }

  if (approvalState === ApproverStatusResponse.Timedout) {
    return ApprovalStatus.TimedOut;
  }

  return ApprovalStatus.Unknown;
};

export const getPipelineRunOfApprovalTask = (
  pipelineRuns: PipelineRunKind[],
  approvalTask: ApprovalTaskKind,
): PipelineRunKind => {
  if (!pipelineRuns || !pipelineRuns.length) {
    return null;
  }

  return (
    pipelineRuns?.find(
      (pr) =>
        pr.metadata.name ===
        approvalTask?.metadata?.labels?.[
          ApprovalLabels[ApprovalFields.PIPELINE_RUN]
        ],
    ) || null
  );
};
