import { getRequestConfig } from "next-intl/server";
import { getUserLocale } from "./locale";

// Each namespace is its own JSON file (one unique top-level key per file) so
// they can be merged with a flat spread below without deep-merge collisions.
// Add new namespace imports here as later i18n phases introduce them.
export default getRequestConfig(async () => {
  const locale = await getUserLocale();

  const messages = {
    ...(await import(`../../messages/${locale}/common.json`)).default,
    ...(await import(`../../messages/${locale}/basic.json`)).default,
    ...(await import(`../../messages/${locale}/expert.json`)).default,
    ...(await import(`../../messages/${locale}/sharedVault.json`)).default,
    ...(await import(`../../messages/${locale}/sharedPools.json`)).default,
    ...(await import(`../../messages/${locale}/sharedLending.json`)).default,
    ...(await import(`../../messages/${locale}/sharedPositions.json`)).default,
    ...(await import(`../../messages/${locale}/sharedSwapEngine.json`)).default,
    ...(await import(`../../messages/${locale}/sharedDiscover.json`)).default,
    ...(await import(`../../messages/${locale}/sharedBorrowing.json`)).default,
    ...(await import(`../../messages/${locale}/sharedOnOffRamps.json`)).default,
    ...(await import(`../../messages/${locale}/sharedReferral.json`)).default,
    ...(await import(`../../messages/${locale}/sharedNotifications.json`))
      .default,
    ...(await import(`../../messages/${locale}/sharedSettings.json`)).default,
    ...(await import(`../../messages/${locale}/sharedDashboard.json`)).default,
    ...(await import(`../../messages/${locale}/sharedAdmin.json`)).default,
    ...(await import(`../../messages/${locale}/simulator.json`)).default,
    ...(await import(`../../messages/${locale}/validation.json`)).default,
    ...(await import(`../../messages/${locale}/errors.json`)).default,
  };

  return { locale, messages };
});
