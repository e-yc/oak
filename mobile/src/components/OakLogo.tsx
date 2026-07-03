import Svg, { G, Path } from 'react-native-svg'
import { colors } from '../theme/mobile-theme'

type Props = {
  size?: number
  color?: string
}

export function OakLogo({ size = 24, color = colors.textPrimary }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 256 256">
      <G fill={color}>
        <Path d="M133 16c14 10 23 20 23 34h-24c0-12-2-22-8-30 3-3 6-4 9-4z" />
        <Path d="M128 46c-47 0-82 27-82 60 0 9 7 16 16 16h132c9 0 16-7 16-16 0-33-35-60-82-60z" />
        <Path d="M64 134h128c0 54-36 92-56 106-5 3.5-11 3.5-16 0-20-14-56-52-56-106z" />
      </G>
    </Svg>
  )
}
