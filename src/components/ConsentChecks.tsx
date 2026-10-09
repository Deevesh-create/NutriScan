import { useRootNav } from '../navigation';
import { Checkbox, InlineLink } from './Checkbox';
import { t } from '../lib/i18n';

export interface ConsentValue {
  terms: boolean;
  health: boolean;
}

/** The two ticks asked for at sign-up (and again when the policy changes): Register and Consent screens. */
export function ConsentChecks(props: { value: ConsentValue; onChange: (v: ConsentValue) => void; errors: Record<string, string> }) {
  const navigation = useRootNav();
  const { value, onChange, errors } = props;
  return (
    <>
      <Checkbox checked={value.terms} onChange={(terms) => onChange({ ...value, terms })} error={errors.terms}>
        {t('I agree to the')} <InlineLink onPress={() => navigation.navigate('Legal', { doc: 'terms' })}>{t('Terms of Use')}</InlineLink>{' '}
        {t('and have read the')} <InlineLink onPress={() => navigation.navigate('Legal', { doc: 'privacy' })}>{t('Privacy Policy')}</InlineLink>.
      </Checkbox>
      <Checkbox checked={value.health} onChange={(health) => onChange({ ...value, health })} error={errors.health}>
        {t(
          'I consent to NutriScan storing my health information (age, sex, height, weight and food diary) to work out my calorie target. I can withdraw it at any time by deleting my account.',
        )}
      </Checkbox>
    </>
  );
}
