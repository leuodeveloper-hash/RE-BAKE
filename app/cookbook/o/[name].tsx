import React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {SharedCookbookScreen} from '@screens/SharedCookbookScreen';

/** 공식 북 공유 링크 — /cookbook/o/{이름} */
export default function OfficialCookbookRoute() {
  const {name} = useLocalSearchParams<{name: string}>();
  return <SharedCookbookScreen name={name ?? ''} />;
}
