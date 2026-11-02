import { ref, shallowRef, type Ref } from 'vue';
import { ApiError, apiErrorMessage } from '@/api/http';

export interface AsyncState<T> {
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<string>;
  reload: () => Promise<void>;
}

export function useAsyncData<T>(
  loader: () => Promise<T>,
  options: { immediate?: boolean } = {},
): AsyncState<T> {
  const data = shallowRef<T | null>(null);
  const loading = ref(false);
  const error = ref('');

  async function reload(): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      data.value = await loader();
    } catch (err) {
      error.value = err instanceof ApiError ? apiErrorMessage(err) : 'unknown';
    } finally {
      loading.value = false;
    }
  }

  if (options.immediate !== false) {
    void reload();
  }

  return { data, loading, error, reload };
}
