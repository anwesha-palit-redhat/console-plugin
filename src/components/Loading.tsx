import * as React from 'react';
import { Spinner, SpinnerProps } from '@patternfly/react-core';
import classNames from 'classnames';

type LoadingProps = {
  className?: string;
  isInline?: boolean;
  size?: SpinnerProps["size"];
  ariaLabel?: string;
};

export const Loading: React.FC<LoadingProps> = ({ className, isInline, size, ariaLabel }) => (
  <div
    className= {classNames(
      'pf-v5-u-display-flex', 
      'pf-v5-u-justify-content-center',
      'pf-v5-u-align-items-center',
      'pf-v5-u-w-100',
      'pf-v5-u-h-100',
      className)}
    data-test="loading-indicator"
  >
    <Spinner 
     size={size}
     isInline={isInline}
     aria-label={ariaLabel}
    />
  </div>
);
Loading.displayName = 'Loading';

export const LoadingInline: React.FC = () => (
  <Loading isInline = {true} />
);
LoadingInline.displayName = 'LoadingInline';
