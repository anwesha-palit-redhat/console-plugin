import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Formik, FormikValues, FormikHelpers } from 'formik';
import { Link } from 'react-router-dom-v5-compat';
import {
  ResourceIcon,
  k8sGet,
  k8sPatch,
} from '@openshift-console/dynamic-plugin-sdk';
import {
  ApprovalTaskModel,
  GroupModel,
  PipelineRunModel,
} from '../../../models';
import { getReferenceForModel } from '../../pipelines-overview/utils';
import { ApprovalStatus, ApprovalTaskKind } from '../../../types';
import { ModalComponent } from '@openshift-console/dynamic-plugin-sdk/lib/app/modal-support/ModalProvider';
import { ModalWrapper } from '../../modals/modal';
import ApprovalModal from './ApprovalModal';

import './ApprovalModal.scss';
import { GroupKind } from 'src/components/utils/approval-group-utils';

type ApprovalProps = {
  resource: ApprovalTaskKind;
  pipelineRunName?: string;
  userName?: string;
  type: string;
};

const Approval: ModalComponent<ApprovalProps> = ({
  closeModal,
  resource,
  pipelineRunName,
  userName,
  type,
}) => {
  const { t } = useTranslation('plugin__pipelines-console-plugin');
  const {
    metadata: { name, namespace },
    spec: { approvers },
  } = resource;

  const initialValues = {
    reason: '',
  };

  const handleSubmit = (
    values: FormikValues,
    action: FormikHelpers<FormikValues>,
  ) => {
    const updatedApprovers = approvers.map((approver) => {
      if (approver.name === userName && approver.type === 'User') {
        return {
          ...approver,
          input:
            type === 'approve'
              ? ApprovalStatus.Accepted
              : ApprovalStatus.Rejected,
          ...(values.reason && { message: values.reason }),
        };
      } else if (approver.type === 'Group') {
        ///

        // try {
        //   const authorized = await isGroupUserUpdated(
        //     currentUser,
        //     approver.message,
        //   );
        // } catch (error) {
        //   console.error('Error checking group authorization:', error);
        // }
        // try {
        //   const group = await k8sGet<GroupKind>({
        //     model: GroupModel,
        //     name: approver.name,
        //   });
        //   if (group.users && group.users.includes(currentUser)) {
        //     return true;
        //   }
        // } catch (error) {
        //   // Log error but continue checking other groups
        //   console.warn(
        //     `Failed to check group membership for group: ${groupName}`,
        //     error,
        //   );
        // }

        // const groupApprovers = approvers.filter(
        //   (approver) => approver.type === 'Group',
        // );
        return approver;
      }
      return approver;
    });
    return k8sPatch({
      model: ApprovalTaskModel,
      resource,
      data: [
        {
          path: '/spec/approvers',
          op: 'replace',
          value: updatedApprovers,
        },
      ],
    })
      .then(() => {
        closeModal();
      })
      .catch((err) => {
        const errMessage =
          err.message || t('An error occurred. Please try again');
        action.setStatus({
          error: errMessage,
        });
      });
  };

  const labelTitle = type === 'approve' ? t('Approve') : t('Reject');

  const approvalMessage =
    type === 'approve'
      ? t('Are you sure you want to approve')
      : t('Please provide a reason for not approving');

  const approvalEnding = type === 'approve' ? '?' : '.';

  const labelDescription = (
    <p>
      {approvalMessage}{' '}
      <ResourceIcon kind={getReferenceForModel(ApprovalTaskModel)} />
      <Link
        to={`/k8s/ns/${namespace}/${getReferenceForModel(
          ApprovalTaskModel,
        )}/${name}`}
      >
        {name}
      </Link>{' '}
      {t('in')} <br />
      <ResourceIcon kind={getReferenceForModel(PipelineRunModel)} />
      <Link
        to={`/k8s/ns/${namespace}/${getReferenceForModel(
          PipelineRunModel,
        )}/${pipelineRunName}`}
      >
        {pipelineRunName}
      </Link>
      {approvalEnding}
    </p>
  );
  return (
    <ModalWrapper className="pipelines-approval-modal" onClose={closeModal}>
      <Formik
        initialValues={initialValues}
        onSubmit={handleSubmit}
        onReset={closeModal}
        initialStatus={{ error: '' }}
      >
        {(formikProps) => (
          <ApprovalModal
            {...formikProps}
            labelTitle={labelTitle}
            labelDescription={labelDescription}
            type={type}
            cancel={closeModal}
          />
        )}
      </Formik>
    </ModalWrapper>
  );
};

export default Approval;
