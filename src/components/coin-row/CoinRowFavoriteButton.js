import React from 'react';
import { BaseButton } from 'react-native-gesture-handler';
import RadialGradient from 'react-native-radial-gradient';
import styled from 'styled-components';
import { useTheme } from '../../context/ThemeContext';
import { Centered } from '../layout';
import { Text } from '../text';
import { CoinRowHeight } from './CoinRow';
import { padding } from '@rainbow-me/styles';
import { magicMemo } from '@rainbow-me/utils';

const FavoriteButtonPadding = 19;

const FavoriteButton = styled(Centered)`
  ${padding(0, FavoriteButtonPadding)};
  bottom: 0;
  flex: 0;
  height: ${CoinRowHeight};
  position: absolute;
  right: 0;
  top: 0;
  width: 68px;
`;

const Circle = styled(RadialGradient).attrs(
  ({ isFavorited, theme: { colors, isDarkMode } }) => ({
    center: [0, 15],
    colors: isFavorited
      ? [
          colors.alpha('#FFB200', isDarkMode ? 0.15 : 0),
          colors.alpha('#FFB200', isDarkMode ? 0.05 : 0.2),
        ]
      : colors.gradients.lightestGrey,
  })
)`
  border-radius: 15px;
  height: 30px;
  overflow: hidden;
  width: 30px;
`;

const StarIcon = styled(Text).attrs(({ isFavorited, theme: { colors } }) => ({
  align: 'center',
  color: isFavorited
    ? colors.yellowFavorite
    : colors.alpha(colors.blueGreyDark, 0.2),
  letterSpacing: 'zero',
  size: 'smaller',
  weight: 'heavy',
}))`
  height: 100%;
  line-height: 29px;
  width: 100%;
`;

const CoinRowFavoriteButton = ({ isFavorited, onPress }) => {
  const { isDarkMode: darkMode } = useTheme();

  return (
    <FavoriteButton as={BaseButton} onPress={onPress}>
      <Circle darkMode={darkMode} isFavorited={isFavorited}>
        <StarIcon isFavorited={isFavorited}>􀋃</StarIcon>
      </Circle>
    </FavoriteButton>
  );
};

export default magicMemo(CoinRowFavoriteButton, 'isFavorited');
