import React from 'react';
import {Composition} from 'remotion';
import {MV} from './MV';
import {A} from './data';

export const RemotionRoot: React.FC = () => (
  <Composition id="MV" component={MV} durationInFrames={A.durationInFrames} fps={A.fps} width={1080} height={1920} />
);
