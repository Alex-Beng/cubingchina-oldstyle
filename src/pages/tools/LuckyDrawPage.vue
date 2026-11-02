<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const input = ref('');
const picked = ref('');
const pool = ref<string[]>([]);

function loadPool() {
  pool.value = input.value
    .split(/[\n,，;；]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  picked.value = '';
}

function draw() {
  if (!pool.value.length) return;
  const index = Math.floor(Math.random() * pool.value.length);
  picked.value = pool.value[index] ?? '';
}
void t;
</script>

<template>
  <div class="col-lg-12 tools-lucky-draw">
    <h2>{{ t('common.Lucky Draw', '抽奖') }}</h2>
    <div class="form-group">
      <label>名单（每行一个，或用逗号分隔）</label>
      <textarea v-model="input" class="form-control" rows="8" @blur="loadPool"></textarea>
    </div>
    <p>
      <button class="btn btn-default" @click="loadPool">载入名单</button>
      <button class="btn btn-primary" :disabled="!pool.length" @click="draw">抽奖</button>
      <span class="text-muted">共 {{ pool.length }} 项</span>
    </p>
    <div v-if="picked" class="draw-result">
      <h1>{{ picked }}</h1>
    </div>
  </div>
</template>

<style scoped>
.draw-result {
  text-align: center;
  padding: 40px 0;
}
.draw-result h1 {
  font-size: 56px;
  color: #6091ba;
  font-weight: 700;
}
</style>
