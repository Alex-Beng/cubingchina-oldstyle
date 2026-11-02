<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { RouterLink } from 'vue-router';

const { t } = useI18n();
</script>

<template>
  <div class="col-lg-12 competition-wca">
    <p>
      {{
        t(
          'statistics.Welcome to the Cubing China results page, where you can find the personal rankings, official records, and fun statistics.',
          '欢迎来到粗饼的成绩页面，在这里你可以找到选手的个人排名、官方纪录以及趣味统计。',
        )
      }}
    </p>
    <ul>
      <li>
        <p><RouterLink to="/results/person">{{ t('common.Persons', '选手') }}</RouterLink></p>
        <p>{{ t('statistics.Here you can find WCA competitors.', '在这里你可以找到WCA选手。') }}</p>
      </li>
      <li>
        <p>
          <RouterLink to="/results/competition">
            {{ t('Competitions.Competitions', '比赛') }}
          </RouterLink>
        </p>
        <p>
          {{ t('statistics.Here you can find WCA competitions.', '在这里你可以找到WCA比赛的赛事成绩。') }}
        </p>
      </li>
      <li>
        <p><RouterLink to="/results/rankings">{{ t('common.Rankings', '排名') }}</RouterLink></p>
        <p>
          {{
            t(
              'statistics.Global personal rankings in each official event are listed, based on the {url}.',
              '我们提供各官方项目的个人排名，数据来源为官方WCA排名。',
            )
          }}
        </p>
      </li>
      <li>
        <p><RouterLink to="/results/records">{{ t('common.Records', '纪录') }}</RouterLink></p>
        <p>
          {{
            t(
              'statistics.Regional records are displayed on the page, based on the {url}.',
              '本页面展示各地区的纪录，数据来源为官方WCA纪录。',
            )
          }}
        </p>
      </li>
      <li>
        <p><RouterLink to="/results/statistics">{{ t('common.Statistics', '统计') }}</RouterLink></p>
        <p>
          {{
            t(
              'statistics.We generate several WCA statistics about Chinese competitions and competitors, based on {url}.',
              '我们基于官方WCA统计数据，生成了关于中国比赛和选手的多项统计。',
            )
          }}
        </p>
      </li>
    </ul>
  </div>
</template>
