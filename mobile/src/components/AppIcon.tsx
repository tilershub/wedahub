import type { ColorValue } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { theme } from '../theme';
const paths = {
 bell:'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5l-2 3m5 3h4M12 2v2',
 home:'M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9',
 building:'M4 21V7h7v14M11 21V3h9v18M2 21h20M7 10v1m0 3v1m0 3v1m8-13h2m-2 4h2m-2 4h2m-2 4h2',
 tools:'m14 6 4-4 1 5-4 4-3-1-8 10-2-2 9-9-1-3 4-4',
 learn:'m2 8 10-5 10 5-10 5L2 8m4 3v6c4 3 8 3 12 0v-6m4-3v9',
 truck:'M2 5h12v12H2V5m12 5h4l4 4v3h-8M5 17a2 2 0 1 0 0 4 2 2 0 0 0 0-4m13 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4',
 food:'M5 3v6m3-6v6M2 3v6c0 2 6 2 6 0M5 11v10M18 3c-5 4-5 9 0 9V3m0 9v9',
 grid:'M3 3h7v7H3V3m11 0h7v7h-7V3M3 14h7v7H3v-7m11 0h7v7h-7v-7',
 clean:'m14 2-4 10m-4-1 10 4-4 7-10-4 4-7m1 4-2 4m5-3-2 4M19 4v6m-3-3h6',
 water:'M12 2S4 11 4 15a8 8 0 0 0 16 0c0-4-8-13-8-13m-4 14c0 2 2 3 4 3',
 bolt:'m13 2-9 12h7l-1 8 10-13h-8l1-7',
 scissors:'M5 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6m0 12a3 3 0 1 0 0 6 3 3 0 0 0 0-6M7 8l14 13M7 16 21 3',
 brush:'m9 14 9-12 4 4-12 10M9 14c-5-1-4 5-7 7 7 1 9-2 8-5',
 camera:'M3 7h4l2-3h6l2 3h4v14H3V7m9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
 search:'M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14m5 12 6 6',
 work:'M3 7h18v14H3V7m5 0V3h8v4M3 12c6 3 12 3 18 0m-9 0v4',
 user:'M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8M3 22v-3c0-8 18-8 18 0v3',
 edit:'m3 16 13-13 5 5L8 21H3v-5m10-10 5 5',
 plus:'M12 3v18M3 12h18',
 left:'m15 4-8 8 8 8',right:'m9 4 8 8-8 8', close:'m5 5 14 14M5 19 19 5',
 certificate:'M5 2h14v13H5V2m3 4h8M8 10h5m-1 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6m-2 5-1 4 3-1 3 1-1-4',
} as const;
export type IconName=keyof typeof paths;
export function AppIcon({name,size=24,color=theme.ink}:{name:IconName;size?:number;color?:ColorValue}){
 return <Svg width={size} height={size} viewBox="0 0 24 24" accessible={false}><Path d={paths[name]} fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"/></Svg>;
}
export function professionIcon(id:string):IconName{
 if(['plumber'].includes(id))return 'water';if(id==='electrician')return 'bolt';if(id==='cleaner')return 'clean';
 if(['tutor','fitness_trainer'].includes(id))return 'learn';if(['driver','mover'].includes(id))return 'truck';
 if(id==='caterer')return 'food';if(id==='tailor')return 'scissors';if(['painter','interior_designer'].includes(id))return 'brush';if(id==='photographer')return 'camera';if(['tiler','mason'].includes(id))return 'grid';return 'tools';
}
