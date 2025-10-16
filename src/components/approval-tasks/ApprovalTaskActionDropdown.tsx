import * as React from 'react';
import { ApprovalTaskKind, PipelineRunKind } from '../../types';
import EllipsisVIcon from '@patternfly/react-icons/dist/esm/icons/ellipsis-v-icon';
import {
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  Tooltip,
} from '@patternfly/react-core';
import { KEBAB_BUTTON_ID } from '../../consts';
import { useTranslation } from 'react-i18next';
import {
  useAccessReview,
  useModal,
} from '@openshift-console/dynamic-plugin-sdk';
import { ApprovalTaskModel } from '../../models';
import { approvalModal } from './modal';
import { ApproverStatusResponse } from '../../types';
<<<<<<< Updated upstream
import { useGetActiveUser } from '../hooks/hooks';
=======
import { useGetActiveUser, useGetActiveUserDetails } from '../hooks/hooks';
import { isUserAuthorizedForApproval } from '../utils/approval-group-utils';
>>>>>>> Stashed changes

type ApprovalTaskActionDropdownProps = {
  approvalTask: ApprovalTaskKind;
  pipelineRun: PipelineRunKind;
};

const ApprovalTaskActionDropdown: React.FC<ApprovalTaskActionDropdownProps> = ({
  approvalTask,
  pipelineRun,
}) => {
  const currentUser = useGetActiveUser();

  console.log('currenuser------', currentUser);

  console.log('currentusersdetails===========', useGetActiveUserDetails());

  const launchModal = useModal();
  const { t } = useTranslation('plugin__pipelines-console-plugin');
  const {
    metadata: { name, namespace },
    status: { state },
    spec: { approvers },
  } = approvalTask;
  const [isOpen, setIsOpen] = React.useState(false);
  const onToggle = () => {
    setIsOpen(!isOpen);
  };
  const onSelect = () => {
    setIsOpen(false);
  };
  const approveAction = () => {
    launchModal(approvalModal, {
      resource: approvalTask,
      pipelineRunName: pipelineRun?.metadata?.name,
      userName: currentUser,
      type: 'approve',
    });
  };

  const rejectAction = () => {
    launchModal(approvalModal, {
      resource: approvalTask,
      pipelineRunName: pipelineRun?.metadata?.name,
      userName: currentUser,
      type: 'reject',
    });
  };

  const canApproveAndRejectResource = useAccessReview({
    group: ApprovalTaskModel.apiGroup,
    resource: ApprovalTaskModel.plural,
    verb: 'patch',
    name,
    namespace,
  });

<<<<<<< Updated upstream
=======
  // Check group-based authorization
  React.useEffect(() => {
    const checkAuthorization = async () => {
      if (currentUser && approvers) {
        try {
          const authorized = await isUserAuthorizedForApproval(
            currentUser,
            approvers,
          );
          console.log('8888888', authorized);
          setIsGroupAuthorized(authorized);
        } catch (error) {
          console.error('Error checking group authorization:', error);
          setIsGroupAuthorized(false);
        }
      } else {
        setIsGroupAuthorized(false);
      }
    };
    checkAuthorization();
  }, [currentUser, approvers]);

>>>>>>> Stashed changes
  const isDropdownDisabled =
    !canApproveAndRejectResource ||
    state !== ApproverStatusResponse.Pending ||
    !approvers?.find((approver) => approver === currentUser);

  console.log('111111111111111', isDropdownDisabled);

  const tooltipContent = () => {
    if (!canApproveAndRejectResource) {
      return t('Insufficient permissions');
    }
    if (state === ApproverStatusResponse.Timedout) {
      return t('PipelineRun has timed out');
    }
    if (state !== ApproverStatusResponse.Pending) {
      return t(`PipelineRun has been {{state}}`, { state });
    }
    if (!approvers?.find((approver) => approver === currentUser)) {
      return t('User not an approver');
    }
    return t('Permission denied');
  };

  const dropdownItems = [
    <DropdownItem
      key="approve"
      component="button"
      isDisabled={isDropdownDisabled}
      data-test-action="approve-pipelineRun"
      onClick={approveAction}
    >
      {t('Approve')}
    </DropdownItem>,
    <DropdownItem
      key="reject"
      component="button"
      isDisabled={isDropdownDisabled}
      data-test-action="reject-pipelineRun"
      onClick={rejectAction}
    >
      {t('Reject')}
    </DropdownItem>,
  ];

  return isDropdownDisabled ? (
    <Tooltip content={tooltipContent()} position="left">
      <Dropdown
        onSelect={onSelect}
        onOpenChange={(isOpen: boolean) => setIsOpen(isOpen)}
        toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
          <MenuToggle
            ref={toggleRef}
            aria-label="kebab menu"
            variant="plain"
            onClick={onToggle}
            isExpanded={isOpen}
            id={KEBAB_BUTTON_ID}
            data-test={KEBAB_BUTTON_ID}
          >
            <EllipsisVIcon />
          </MenuToggle>
        )}
        isOpen={isOpen && !isDropdownDisabled}
        isPlain={false}
        popperProps={{ position: 'right' }}
      >
        <DropdownList>{dropdownItems}</DropdownList>
      </Dropdown>
    </Tooltip>
  ) : (
    <Dropdown
      onSelect={onSelect}
      onOpenChange={(isOpen: boolean) => setIsOpen(isOpen)}
      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
        <MenuToggle
          ref={toggleRef}
          aria-label="kebab menu"
          variant="plain"
          onClick={onToggle}
          isExpanded={isOpen}
          id={KEBAB_BUTTON_ID}
          data-test={KEBAB_BUTTON_ID}
        >
          <EllipsisVIcon />
        </MenuToggle>
      )}
      isOpen={isOpen}
      isPlain={false}
      popperProps={{ position: 'right' }}
    >
      <DropdownList>{dropdownItems}</DropdownList>
    </Dropdown>
  );
};

export default ApprovalTaskActionDropdown;
