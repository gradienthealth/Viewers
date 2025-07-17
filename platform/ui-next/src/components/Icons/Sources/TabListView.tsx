import React from 'react';
import type { IconProps } from '../types';

export const ListView = (props: IconProps) => (
  <svg
    width="22px"
    height="22px"
    viewBox="0 0 22 22"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <g
      stroke="none"
      strokeWidth="1"
      fill="none"
      fillRule="evenodd"
    >
      <rect
        id="Rectangle"
        x="0"
        y="0"
        width="22"
        height="22"
      ></rect>
      <line
        x1="7.5"
        y1="3.5"
        x2="22.5"
        y2="3.5"
        id="Line-2"
        stroke="currentColor"
        strokeLinecap="round"
      ></line>
      <line
        x1="7.5"
        y1="11"
        x2="22.5"
        y2="11"
        id="Line-2"
        stroke="currentColor"
        strokeLinecap="round"
      ></line>
      <line
        x1="7.5"
        y1="18.5"
        x2="22.5"
        y2="18.5"
        id="Line-2"
        stroke="currentColor"
        strokeLinecap="round"
      ></line>
      <circle
        id="Oval"
        fill="currentColor"
        cx="4"
        cy="3.5"
        r="2"
      ></circle>
      <circle
        id="Oval"
        fill="currentColor"
        cx="4"
        cy="11"
        r="2"
      ></circle>
      <circle
        id="Oval"
        fill="currentColor"
        cx="4"
        cy="18.5"
        r="2"
      ></circle>
    </g>
  </svg>
);

export default ListView;
