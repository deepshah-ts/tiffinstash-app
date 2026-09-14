import {Ionicons} from '@expo/vector-icons';
import {Image} from 'expo-image';
import {LinearGradient} from 'expo-linear-gradient';
import React, {useEffect, useState} from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {Text} from './Typography';
import {imageUrl} from '../services/content';
import {C} from '../theme';
import type {AppConfig, Banner, Product} from '../types';
import {sortEnabled} from '../../lib/core.cjs';

const iconName = (name: string) => name as keyof typeof Ionicons.glyphMap;

export function Icon({name, size = 22, color = C.ink}: {name: string; size?: number; color?: string}) {
  return <Ionicons name={iconName(name)} size={size} color={color}/>;
}

export function ActionButton({label, onPress, secondary = false, disabled = false, icon = 'arrow-forward'}: {
  label: string; onPress: () => void; secondary?: boolean; disabled?: boolean; icon?: string;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={({pressed}) => [s.button, secondary && s.buttonSecondary, (pressed || disabled) && s.pressed]}>
    <Text numberOfLines={2} style={[s.buttonText, secondary && s.buttonTextSecondary]}>{label}</Text>
    <Icon name={icon} size={18} color={secondary ? C.primaryInk : C.paper}/>
  </Pressable>;
}

export function CircleButton({label, icon, onPress, active = false}: {label: string; icon: string; onPress: () => void; active?: boolean}) {
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({pressed}) => [s.circleButton, active && s.circleButtonActive, pressed && s.pressed]}>
    <Icon name={icon} size={23} color={active ? C.orange : C.ink}/>
  </Pressable>;
}

export function RemoteImage({uri, style, alt, contentFit = 'cover'}: {uri: string; style: any; alt: string; contentFit?: 'cover' | 'contain'}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  if (!uri || failed) return <View style={[style, s.imageFallback]}><Icon name="restaurant-outline" size={30} color={C.orange}/></View>;
  return <Image source={{uri}} style={style} contentFit={contentFit} transition={220} accessibilityLabel={alt} onError={() => setFailed(true)}/>;
}

export function SectionHeader({title, subtitle, actionLabel, onAction}: {title: string; subtitle?: string; actionLabel?: string; onAction?: () => void}) {
  return <View style={s.sectionHeader}>
    <View style={s.flex}><Text style={s.sectionTitle}>{title}</Text>{!!subtitle && <Text style={s.sectionSubtitle}>{subtitle}</Text>}</View>
    {!!actionLabel && !!onAction && <Pressable accessibilityRole="button" onPress={onAction} hitSlop={10}><Text style={s.textLink}>{actionLabel}</Text></Pressable>}
  </View>;
}

export function BannerCarousel({config, banners, openShop}: {config: AppConfig; banners: Banner[]; openShop: (path: string, title: string) => void}) {
  const {width} = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const cardWidth = Math.min(width - 40, 640);
  const visible = sortEnabled(banners);
  if (!visible.length) return null;
  return <View>
    <ScrollView horizontal pagingEnabled decelerationRate="fast" snapToInterval={cardWidth + 12} showsHorizontalScrollIndicator={false} contentContainerStyle={s.bannerRail} onMomentumScrollEnd={event => setActiveIndex(Math.max(0, Math.min(visible.length - 1, Math.round(event.nativeEvent.contentOffset.x / (cardWidth + 12)))))}>
      {visible.map(banner => {
        const uri = imageUrl(config, banner.imageAssetId, banner.imageUrl);
        const lightText = banner.textColor.toUpperCase() === '#FFFFFF';
        return <Pressable key={banner.id} accessibilityRole="button" accessibilityLabel={`${banner.title}. ${banner.ctaLabel}`} onPress={() => openShop(banner.path, banner.title)} style={({pressed}) => [{width: cardWidth, backgroundColor: banner.backgroundColor}, s.banner, pressed && s.pressed]}>
          <RemoteImage uri={uri} alt={config.assets[banner.imageAssetId]?.altText || banner.title} style={s.bannerImage}/>
          <LinearGradient colors={[banner.backgroundColor, `${banner.backgroundColor}F2`, `${banner.backgroundColor}44`]} locations={[0, .58, 1]} start={{x: 0, y: .5}} end={{x: 1, y: .5}} style={StyleSheet.absoluteFill}/>
          <View style={s.bannerCopy}>
            {!!banner.eyebrow && <Text style={[s.bannerEyebrow, {color: banner.textColor}]}>{banner.eyebrow}</Text>}
            <Text style={[s.bannerTitle, {color: banner.textColor}]}>{banner.title}</Text>
            {!!banner.subtitle && <Text style={[s.bannerSubtitle, {color: banner.textColor}]}>{banner.subtitle}</Text>}
            <View style={[s.bannerCta, {backgroundColor: lightText ? C.paper : C.black}]}><Text style={[s.bannerCtaText, {color: lightText ? C.primaryInk : C.paper}]}>{banner.ctaLabel}</Text><Icon name="arrow-forward" size={17} color={lightText ? C.primaryInk : C.paper}/></View>
          </View>
        </Pressable>;
      })}
    </ScrollView>
    {visible.length > 1 && <View style={s.dots}>{visible.map((banner, index) => <View key={banner.id} style={[s.dot, index === activeIndex && s.dotActive]}/>)}</View>}
  </View>;
}

export function CollectionRail({config, title, subtitle, openShop}: {config: AppConfig; title: string; subtitle?: string; openShop: (path: string, title: string) => void}) {
  const items = sortEnabled(config.collections);
  if (!items.length) return null;
  return <View style={s.section}><SectionHeader title={title} subtitle={subtitle}/><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.collectionRail}>
    {items.map(item => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Browse ${item.title}`} onPress={() => openShop(item.path, item.title)} style={({pressed}) => [s.collectionCard, pressed && s.pressed]}>
      <RemoteImage uri={imageUrl(config, item.imageAssetId, item.imageUrl)} alt={config.assets[item.imageAssetId]?.altText || item.title} style={s.collectionImage}/>
      <Text numberOfLines={1} style={s.collectionTitle}>{item.title}</Text><Text numberOfLines={2} style={s.collectionSubtitle}>{item.subtitle}</Text>
    </Pressable>)}
  </ScrollView></View>;
}

export function ProductCard({config, product, saved, onSave, onOpen, grid = false}: {config: AppConfig; product: Product; saved: boolean; onSave: () => void; onOpen: () => void; grid?: boolean}) {
  return <View style={[s.productCard, grid && s.productCardGrid]}>
    <Pressable accessibilityRole="button" accessibilityLabel={`View ${product.title}`} onPress={onOpen} style={s.productImageWrap}>
      <RemoteImage uri={imageUrl(config, product.imageAssetId, product.imageUrl)} alt={config.assets[product.imageAssetId]?.altText || product.title} style={s.productImage}/>
      {!!product.badge && <View style={s.badge}><Text style={s.badgeText}>{product.badge}</Text></View>}
    </Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={`${saved ? 'Remove' : 'Save'} ${product.title}`} accessibilityState={{selected: saved}} onPress={onSave} style={s.heartButton}><Icon name={saved ? 'heart' : 'heart-outline'} size={22} color={saved ? C.orange : C.ink}/></Pressable>
    <Pressable accessibilityRole="button" onPress={onOpen} style={s.productBody}>
      <Text style={s.productKicker}>{product.cuisine.toUpperCase()}</Text><Text numberOfLines={2} style={s.productTitle}>{product.title}</Text><Text numberOfLines={2} style={s.productSubtitle}>{product.subtitle}</Text>
      <View style={s.productBottom}><Text style={s.productLink}>{product.priceLabel}</Text><Icon name="arrow-forward" size={17} color={C.primaryInk}/></View>
    </Pressable>
  </View>;
}

export function ProductRailView({config, railId, titleOverride, subtitleOverride, favourites, toggleSave, openShop}: {config: AppConfig; railId: string; titleOverride?: string; subtitleOverride?: string; favourites: string[]; toggleSave: (id: string) => void; openShop: (path: string, title: string) => void}) {
  const rail = config.productRails.find(item => item.id === railId && item.enabled);
  if (!rail) return null;
  const products = sortEnabled(config.products.filter(item => item.railId === rail.id)).slice(0, rail.maxItems);
  if (!products.length) return null;
  return <View style={s.section}><SectionHeader title={titleOverride || rail.title} subtitle={subtitleOverride || rail.subtitle}/><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.productRail}>
    {products.map(product => <ProductCard key={product.id} config={config} product={product} saved={favourites.includes(product.id)} onSave={() => toggleSave(product.id)} onOpen={() => openShop(product.path, product.title)}/>)}
  </ScrollView></View>;
}

export function QuickLinks({config, title, subtitle, openShop}: {config: AppConfig; title: string; subtitle?: string; openShop: (path: string, title: string) => void}) {
  const links = sortEnabled(config.quickLinks);
  if (!links.length) return null;
  return <View style={s.section}><SectionHeader title={title} subtitle={subtitle}/><View style={s.quickGrid}>{links.map(link => <Pressable key={link.id} accessibilityRole="button" onPress={() => openShop(link.path, link.title)} style={({pressed}) => [s.quickCard, pressed && s.pressed]}>
    <View style={s.quickIcon}><Icon name={link.icon} size={23} color={C.orange}/></View><Text style={s.quickTitle}>{link.title}</Text><Text numberOfLines={2} style={s.quickSubtitle}>{link.subtitle}</Text><Icon name="arrow-forward" size={18} color={C.primaryInk}/>
  </Pressable>)}</View></View>;
}

export function SupportCard({title, subtitle, onPress}: {title: string; subtitle: string; onPress: () => void}) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed}) => [s.supportCard, pressed && s.pressed]}><View style={s.supportIcon}><Icon name="chatbubble-ellipses-outline" size={24} color={C.orange}/></View><View style={s.flex}><Text style={s.supportTitle}>{title}</Text><Text style={s.supportSubtitle}>{subtitle}</Text></View><Icon name="arrow-forward" size={19} color={C.primaryInk}/></Pressable>;
}

export function InfoRow({icon, title, subtitle, onPress}: {icon: string; title: string; subtitle?: string; onPress: () => void}) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed}) => [s.infoRow, pressed && s.pressed]}><View style={s.infoIcon}><Icon name={icon} size={22} color={C.orange}/></View><View style={s.flex}><Text style={s.infoTitle}>{title}</Text>{!!subtitle && <Text style={s.infoSubtitle}>{subtitle}</Text>}</View><Icon name="chevron-forward" size={18} color={C.muted}/></Pressable>;
}

export function BottomSheet({visible, title, onClose, children}: {visible: boolean; title: string; onClose: () => void; children: React.ReactNode}) {
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={s.sheetOverlay}><Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={StyleSheet.absoluteFill}/><SafeAreaView edges={['bottom']} style={s.sheet} accessibilityViewIsModal><View style={s.sheetGrabber}/><View style={s.sheetHeader}><Text style={s.sheetTitle}>{title}</Text><CircleButton label="Close" icon="close" onPress={onClose}/></View>{children}</SafeAreaView></View></Modal>;
}

export function EmptyState({icon, title, body}: {icon: string; title: string; body: string}) {
  return <View style={s.emptyState}><View style={s.emptyIcon}><Icon name={icon} size={32} color={C.orange}/></View><Text style={s.emptyTitle}>{title}</Text><Text style={s.emptyBody}>{body}</Text></View>;
}

export const ui = StyleSheet.create({
  productGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10},
  sheetBody: {fontSize: 12, lineHeight: 19, color: C.muted},
  sheetList: {maxHeight: 410},
  cityRow: {minHeight: 53, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line},
  settingRow: {minHeight: 64, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line},
  infoTitle: {fontSize: 13, lineHeight: 19, color: C.ink, fontWeight: '600'},
  truthNote: {fontSize: 10, lineHeight: 16, color: C.muted},
  pressed: {opacity: .72}
});

const s = StyleSheet.create({
  flex: {flex: 1}, pressed: {opacity: .72, transform: [{scale: .99}]},
  button: {minHeight: 52, paddingHorizontal: 17, paddingVertical: 13, borderRadius: 16, backgroundColor: C.orange, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9},
  buttonSecondary: {backgroundColor: C.orangeSoft, borderWidth: 1, borderColor: '#FFDCC7'}, buttonText: {fontSize: 13, color: C.paper, textAlign: 'center', fontWeight: '700'}, buttonTextSecondary: {color: C.primaryInk},
  circleButton: {width: 44, height: 44, borderRadius: 16, backgroundColor: C.neutral, alignItems: 'center', justifyContent: 'center'}, circleButtonActive: {backgroundColor: C.orangeSoft}, imageFallback: {backgroundColor: C.orangeSoft, alignItems: 'center', justifyContent: 'center'},
  section: {gap: 13}, sectionHeader: {flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12}, sectionTitle: {fontSize: 20, lineHeight: 26, letterSpacing: -.45, color: C.ink, fontWeight: '700'}, sectionSubtitle: {fontSize: 11, lineHeight: 17, color: C.muted}, textLink: {fontSize: 12, lineHeight: 18, color: C.primaryInk, fontWeight: '700'},
  bannerRail: {gap: 12}, banner: {height: 330, borderRadius: 28, overflow: 'hidden', justifyContent: 'flex-end'}, bannerImage: {position: 'absolute', right: 0, top: 0, bottom: 0, width: '62%', height: '100%'}, bannerCopy: {padding: 25, width: '76%', gap: 10},
  bannerEyebrow: {fontSize: 9, lineHeight: 14, letterSpacing: 1.5, fontWeight: '700'}, bannerTitle: {fontSize: 31, lineHeight: 37, letterSpacing: -1.1, fontWeight: '800'}, bannerSubtitle: {fontSize: 12, lineHeight: 19, maxWidth: 260}, bannerCta: {alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 15, minHeight: 45, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 9}, bannerCtaText: {fontSize: 12, fontWeight: '700'},
  dots: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 10}, dot: {width: 6, height: 6, borderRadius: 3, backgroundColor: '#D4D4D8'}, dotActive: {width: 20, backgroundColor: C.orange},
  collectionRail: {gap: 11, paddingRight: 4}, collectionCard: {width: 112, borderRadius: 19, backgroundColor: C.neutral, padding: 9, gap: 5}, collectionImage: {width: 94, height: 94, borderRadius: 15, backgroundColor: C.orangeSoft}, collectionTitle: {fontSize: 12, lineHeight: 18, fontWeight: '700', color: C.ink, marginTop: 2}, collectionSubtitle: {fontSize: 9, lineHeight: 13, color: C.muted, minHeight: 26},
  productRail: {gap: 12, paddingRight: 4}, productCard: {width: 218, backgroundColor: C.paper, borderRadius: 21, borderWidth: 1, borderColor: C.line, overflow: 'hidden'}, productCardGrid: {width: '48%', flexGrow: 1, maxWidth: '50%'}, productImageWrap: {height: 154, backgroundColor: C.orangeSoft}, productImage: {width: '100%', height: '100%'}, badge: {position: 'absolute', left: 10, bottom: 10, backgroundColor: C.paper, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5}, badgeText: {fontSize: 9, color: C.primaryInk, fontWeight: '700'}, heartButton: {position: 'absolute', right: 9, top: 9, width: 39, height: 39, borderRadius: 20, backgroundColor: '#FFFFFFEE', alignItems: 'center', justifyContent: 'center'},
  productBody: {padding: 14, gap: 5}, productKicker: {fontSize: 8, lineHeight: 12, letterSpacing: 1.1, color: C.orange, fontWeight: '700'}, productTitle: {fontSize: 15, lineHeight: 20, minHeight: 39, color: C.ink, fontWeight: '700'}, productSubtitle: {fontSize: 10, lineHeight: 15, minHeight: 30, color: C.muted}, productBottom: {marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}, productLink: {fontSize: 11, color: C.primaryInk, fontWeight: '700'},
  quickGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 10}, quickCard: {width: '48%', flexGrow: 1, minHeight: 156, padding: 15, borderRadius: 20, backgroundColor: C.neutral, gap: 7, alignItems: 'flex-start'}, quickIcon: {width: 43, height: 43, borderRadius: 14, backgroundColor: C.orangeSoft, alignItems: 'center', justifyContent: 'center'}, quickTitle: {fontSize: 13, lineHeight: 18, color: C.ink, fontWeight: '700'}, quickSubtitle: {fontSize: 9, lineHeight: 14, color: C.muted, flex: 1},
  supportCard: {minHeight: 86, padding: 15, borderRadius: 20, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.paper}, supportIcon: {width: 48, height: 48, borderRadius: 16, backgroundColor: C.orangeSoft, alignItems: 'center', justifyContent: 'center'}, supportTitle: {fontSize: 13, lineHeight: 19, color: C.ink, fontWeight: '700'}, supportSubtitle: {fontSize: 10, lineHeight: 16, color: C.muted, marginTop: 2},
  infoRow: {minHeight: 72, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: C.line}, infoIcon: {width: 42, height: 42, borderRadius: 14, backgroundColor: C.orangeSoft, alignItems: 'center', justifyContent: 'center'}, infoTitle: {fontSize: 13, lineHeight: 19, color: C.ink, fontWeight: '600'}, infoSubtitle: {fontSize: 10, lineHeight: 16, color: C.muted, marginTop: 2},
  sheetOverlay: {flex: 1, backgroundColor: '#0D0E1570', justifyContent: 'flex-end'}, sheet: {width: '100%', maxWidth: 680, maxHeight: '88%', alignSelf: 'center', paddingHorizontal: 22, paddingBottom: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: C.paper, gap: 14}, sheetGrabber: {width: 42, height: 4, borderRadius: 2, backgroundColor: '#D6D6DA', alignSelf: 'center', marginTop: 10}, sheetHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12}, sheetTitle: {flex: 1, fontSize: 19, lineHeight: 25, color: C.ink, fontWeight: '700'},
  emptyState: {padding: 28, borderRadius: 22, backgroundColor: C.neutral, alignItems: 'center', gap: 9}, emptyIcon: {width: 62, height: 62, borderRadius: 21, backgroundColor: C.orangeSoft, alignItems: 'center', justifyContent: 'center'}, emptyTitle: {fontSize: 16, lineHeight: 23, textAlign: 'center', color: C.ink, fontWeight: '700'}, emptyBody: {fontSize: 11, lineHeight: 18, textAlign: 'center', color: C.muted}
});
