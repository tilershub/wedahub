import { useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLanguage } from '../i18n';
import { theme } from '../theme';
import { AppIcon } from './AppIcon';
export function PhotoCarousel({images,label}:{images:string[];label:string}){
 const {t}=useLanguage();const scroll=useRef<ScrollView>(null);const [width,setWidth]=useState(280),[index,setIndex]=useState(0);
 const move=(next:number)=>{scroll.current?.scrollTo({x:next*width,animated:true});setIndex(next);};
 if(!images.length)return null;
 return <View onLayout={event=>{const next=event.nativeEvent.layout.width;if(next>0){setWidth(next);scroll.current?.scrollTo({x:index*next,animated:false});}}}>
  <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={event=>setIndex(Math.round(event.nativeEvent.contentOffset.x/width))}>
   {images.map((uri,i)=><Image key={`${uri}-${i}`} source={{uri}} style={{width,height:Math.min(width*.72,360),borderRadius:12}} resizeMode="cover" accessibilityLabel={`${label} ${i+1} / ${images.length}`}/>)}
  </ScrollView>
  <View style={styles.controls}><Pressable style={styles.button} accessibilityRole="button" accessibilityLabel={t('previousPhoto')} disabled={index<=0} onPress={()=>move(index-1)}><AppIcon name="left" color={index<=0?theme.line:theme.ink}/></Pressable><Text style={styles.count}>{Math.min(index+1,images.length)} / {images.length}</Text><Pressable style={styles.button} accessibilityRole="button" accessibilityLabel={t('nextPhoto')} disabled={index>=images.length-1} onPress={()=>move(index+1)}><AppIcon name="right" color={index>=images.length-1?theme.line:theme.ink}/></Pressable></View>
 </View>;
}
const styles=StyleSheet.create({controls:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},button:{width:48,height:48,alignItems:'center',justifyContent:'center'},count:{fontSize:14,color:theme.muted}});
