import * as React from 'react';
import cx from 'classnames';
import { useTranslation } from 'react-i18next';
import { Label, LabelGroup } from '@patternfly/react-core';
import {
  ApprovalTaskKind,
  Approver,
  ApproverResponse,
  ApproverStatusResponse,
} from '../../../types';
import { ApprovalStatusIcon } from '../../pipeline-topology/StatusIcons';

import './ApproverList.scss';

export interface ApproverListProps {
  obj: ApprovalTaskKind;
}

export interface ApproverBadgeProps {
  approver: Approver;
  status: ApproverResponse;
}

const ApproverBadge: React.FC<ApproverBadgeProps> = ({ approver, status }) => {
  const badgeClass = cx({
    'pipelines-approval-approver__wait':
      status === ApproverStatusResponse.Pending,
    'pipelines-approval-approver__approved':
      status !== ApproverStatusResponse.Pending,
  });

  console.log('Approver', approver);

  const color =
    status === ApproverStatusResponse.Pending
      ? 'orange'
      : status === ApproverStatusResponse.Accepted
      ? 'green'
      : 'red';

  return (
    <Label
      className="pipelines-approval-status-badge"
      color={color}
      icon={
        <div className={badgeClass}>
          <svg width={30} height={30} viewBox="-12 -5 30 30">
            <ApprovalStatusIcon status={status} />
          </svg>
        </div>
      }
    >
<<<<<<< Updated upstream
      {approver}
=======
      {approver.type == 'Group'
        ? 'Group' + ': ' + approver.name
        : 'User' + ': ' + approver.name}
>>>>>>> Stashed changes
    </Label>
  );
};

const ApproverListSection: React.FC<ApproverListProps> = ({ obj }) => {
  const { t } = useTranslation('plugin__pipelines-console-plugin');
  const {
    status: { approversResponse },
  } = obj;

  const {
    spec: { approvers },
  } = obj;
  if (!approvers || approvers?.length === 0) {
    return <p>{t('No approvers')}</p>;
  }

  const getApprovalStatusforApprovers = (
    approver: Approver,
  ): ApproverResponse => {
    return (
      approversResponse?.find(
        (approvalStatus) =>
          approvalStatus.name === approver.name &&
          approvalStatus.type === approver.type,
      )?.response ?? ApproverStatusResponse.Pending
    );
  };

  return (
    <LabelGroup
      defaultIsOpen
      numLabels={10}
      className="pipelines-approval-approver-list"
    >
      {approvers?.map((approver, idx) => (
        <ApproverBadge
          approver={approver}
          status={getApprovalStatusforApprovers(approver)}
          key={`approver-${idx.toString()}`}
        />
      ))}
    </LabelGroup>
  );
};

export default ApproverListSection;
