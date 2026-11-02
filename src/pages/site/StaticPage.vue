<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { currentLocale } from '@/i18n';
import { aboutSideNav, aboutLinks } from '@/config/about';
import { siteAsset } from '@/router';

const props = defineProps<{ page: string }>();
const { t, te } = useI18n();

const isZh = computed(() => currentLocale() !== 'en');

const title = computed(() => {
  const nav = aboutSideNav.find((n) => n.key === props.page);
  return nav ? (te(nav.label) ? t(nav.label) : props.page) : props.page;
});

void siteAsset;
void isZh;
</script>

<template>
  <aside class="page-sidebar about-side col-md-2 col-sm-3">
    <section class="widget">
      <ul class="nav">
        <li v-for="item in aboutSideNav" :key="item.key">
          <RouterLink :to="item.path">
            {{ te(item.label) ? t(item.label) : item.key }}
          </RouterLink>
        </li>
      </ul>
    </section>
  </aside>

  <div class="content-wrapper col-md-10 col-sm-9">
    <h2>{{ title }}</h2>

    <template v-if="page === 'about'">
      <div v-if="isZh" class="static-body">
        <p>
          魔方吧·中国魔方俱乐部（MF8）成立于2004年，是中国最早的魔方信息分享网站，现已成为国内最大最专业的魔方论坛。
          在过去十年间，众多魔方爱好者和专业玩家汇聚在魔方吧，共同分享魔方带给我们的乐趣，并向大众普及和传播魔方的巨大魅力。
        </p>
        <p>
          粗饼·中国魔方赛事网（Cubing China）由魔方吧创立人及站长霍先生、世界魔方协会成绩组专员董百强、
          世界魔方协会官方代表郑鸣于2014年共同创办，其前身为魔方吧的在线比赛报名系统。
          我们共同致力于为魔方玩家建立更好的魔方竞速比赛平台，进一步发展魔方竞速运动，推广国内的专业魔方赛事。
        </p>
        <blockquote>
          <p>
            本页面为旧版粗饼网的第三方复刻版本，数据来自粗饼网公开 API，
            原网站已迁移至<a href="https://cubing.com" target="_blank" rel="noopener">新版粗饼网</a>。
          </p>
        </blockquote>
      </div>
      <div v-else class="static-body">
        <p>
          The MF8 Chinese Cube Club (MF8) was founded in 2004 and is the earliest Chinese
          website dedicated to sharing cubing information. It has grown into the largest and
          most professional cubing forum in China.
        </p>
        <p>
          Cubing China was founded in 2014 by Mr. Huo (founder of MF8), Baiqiang Dong (WCA
          Results Team member) and Ming Zheng (WCA Delegate). It started as the online
          registration system of MF8 and now focuses on building a better competition platform
          and promoting professional cubing events in China.
        </p>
        <blockquote>
          <p>
            This page is a third-party reconstruction of the legacy Cubing China interface.
            All data is provided by the public Cubing China API. The original site has moved to
            <a href="https://cubing.com" target="_blank" rel="noopener">the new Cubing China</a>.
          </p>
        </blockquote>
      </div>
    </template>

    <template v-else-if="page === 'contact'">
      <div v-if="isZh" class="static-body">
        <p>
          如果你想给我们提出更多更好的意见和建议，欢迎通过以下邮件联系我们：
          <br /><i class="fa fa-envelope"></i>
          <a href="mailto:contact@cubing.com">contact@cubing.com</a>。
        </p>
        <p>
          如果你想在粗饼平台申请并公示一场魔方比赛，或提交与比赛相关的材料，
          请联系粗饼赛事审核与质量保证组：
          <br /><i class="fa fa-envelope"></i>
          <a href="mailto:competitions@cubing.com">competitions@cubing.com</a>。
        </p>
        <p>
          如果你想咨询世界魔方协会相关事宜，请联系世界魔方协会通讯组中国团队：
          <br /><i class="fa fa-envelope"></i>
          <a href="mailto:wct-china@worldcubeassociation.org">wct-china@worldcubeassociation.org</a>。
        </p>
        <p>
          如果你对比赛成绩或比赛规则有疑问，可以联系中国的世界魔方协会代表（WCA Delegates）
          公共邮箱：
          <br /><i class="fa fa-envelope"></i>
          <a href="mailto:delegates@cubing.com">delegates@cubing.com</a>。
        </p>
      </div>
      <div v-else class="static-body">
        <p>
          For feedback and suggestions, contact us at
          <a href="mailto:contact@cubing.com">contact@cubing.com</a>.
        </p>
        <p>
          To apply for a competition or submit event materials, contact the competition review
          team at <a href="mailto:competitions@cubing.com">competitions@cubing.com</a>.
        </p>
        <p>
          For WCA-related enquiries, contact the WCA China team at
          <a href="mailto:wct-china@worldcubeassociation.org">wct-china@worldcubeassociation.org</a>.
        </p>
        <p>
          For questions about results or regulations, contact the Chinese WCA Delegates at
          <a href="mailto:delegates@cubing.com">delegates@cubing.com</a>.
        </p>
      </div>
    </template>

    <template v-else-if="page === 'links'">
      <div class="static-body">
        <div v-for="(link, index) in aboutLinks" :key="index" class="link-item">
          <h3>
            <a :href="link.url" target="_blank" rel="noopener">
              {{ isZh ? link.name_zh || link.name : link.name }}
            </a>
          </h3>
          <p>{{ isZh ? link.description_zh || link.description : link.description }}</p>
        </div>
      </div>
    </template>

    <template v-else-if="page === 'disclaimer'">
      <div v-if="isZh" class="static-body">
        <p>
          本站为旧版粗饼网的第三方复刻页面，所有数据均来自粗饼网公开 API，
          本站不存储任何数据，也不代表粗饼网或世界魔方协会。
        </p>
        <p>
          数据的准确性以官方公布为准。如与官方数据存在差异，请以
          <a href="https://cubing.com" target="_blank" rel="noopener">新版粗饼网</a>
          与
          <a href="https://www.worldcubeassociation.org" target="_blank" rel="noopener">
            WCA 官网
          </a>
          为准。
        </p>
        <p>报名、支付与账号相关功能已不再提供，相关操作请前往新版粗饼网。</p>
      </div>
      <div v-else class="static-body">
        <p>
          This is a third-party reconstruction of the legacy Cubing China interface. All data
          is provided by the public Cubing China API. This site stores no data and is not
          affiliated with Cubing China or the World Cube Association.
        </p>
        <p>
          For authoritative data please refer to
          <a href="https://cubing.com" target="_blank" rel="noopener">the new Cubing China</a>
          and
          <a href="https://www.worldcubeassociation.org" target="_blank" rel="noopener">
            the WCA website
          </a>.
        </p>
        <p>
          Registration, payment and account features are not available here. Please use the new
          Cubing China for those actions.
        </p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.static-body {
  line-height: 1.8;
}
.static-body p {
  margin-bottom: 12px;
}
.link-item {
  margin-bottom: 18px;
}
.link-item h3 {
  margin-bottom: 4px;
}
</style>
