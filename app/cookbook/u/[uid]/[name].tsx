import React from 'react';
import {useLocalSearchParams} from 'expo-router';
import {SharedCookbookScreen} from '@screens/SharedCookbookScreen';

/** 공개한 개인 북 링크 — /cookbook/u/{uid}/{이름} */
export default function PublicCookbookRoute() {
  const {uid, name} = useLocalSearchParams<{uid: string; name: string}>();
  return <SharedCookbookScreen name={name ?? ''} ownerUid={uid} />;
}
