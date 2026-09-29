/* eslint-disable no-unused-vars, no-undef */
import type { FC } from 'react';
import { Checkbox } from '@patternfly/react-core';
import ToggleableFieldBase, { CheckboxFieldProps } from './ToggleableFieldBase';

const CheckboxField: FC<CheckboxFieldProps> = (baseProps) => (
  <ToggleableFieldBase {...baseProps}>
    {(props) => (
      <Checkbox
        {...props}
        data-checked-state={props.isChecked}
        data-test={baseProps.dataTest}
      />
    )}
  </ToggleableFieldBase>
);

export default CheckboxField;
