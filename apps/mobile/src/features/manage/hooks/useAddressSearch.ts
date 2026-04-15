import { useCallback, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { fetchMobileKakaoAddressSearch } from '../../../lib/api';
import { buildKakaoMapSearchUrl, type ManageFormState } from '../shared';

type UseAddressSearchOptions = {
  apiBaseUrl: string;
  setForm: Dispatch<SetStateAction<ManageFormState>>;
  setNotice: (message: string) => void;
};

export function useAddressSearch({
  apiBaseUrl,
  setForm,
  setNotice,
}: UseAddressSearchOptions) {
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  const handleSearchAddress = useCallback(
    async (query: string) => {
      const normalizedQuery = query.trim();
      if (!normalizedQuery) {
        setNotice('예식장 주소를 먼저 입력해 주세요.');
        return;
      }

      setIsSearchingAddress(true);

      try {
        const result = await fetchMobileKakaoAddressSearch(apiBaseUrl, normalizedQuery);
        setForm((current) => ({
          ...current,
          ceremonyAddress: result.addressName,
          mapUrl: buildKakaoMapSearchUrl(result.addressName),
          kakaoLatitude: String(result.latitude),
          kakaoLongitude: String(result.longitude),
          kakaoMarkerTitle:
            current.kakaoMarkerTitle.trim() || current.venue.trim() || result.addressName,
        }));
        setNotice('카카오 주소 검색으로 좌표를 자동 입력했습니다.');
      } catch (error) {
        setNotice(error instanceof Error ? error.message : '주소 검색에 실패했습니다.');
      } finally {
        setIsSearchingAddress(false);
      }
    },
    [apiBaseUrl, setForm, setNotice]
  );

  return {
    isSearchingAddress,
    handleSearchAddress,
  };
}
