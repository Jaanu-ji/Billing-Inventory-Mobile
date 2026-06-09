/**
 * LoginScreen — phone-OTP login gate (Phase J).
 *
 * Two steps in one screen: enter mobile number → enter the SMS code. Wired to
 * the AuthService interface (a local mock during scaffolding; Firebase phone
 * auth in production). On success it routes to Setup (first launch) or Main.
 *
 * Only this screen needs network; once signed in the session persists locally
 * and the rest of the app — including billing — works fully offline.
 */
import React, {useState} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {AppText, Button, Field, Icon, Input} from '../components/ui';
import {authService} from '../services/AuthService';
import {ProfileService} from '../services/ProfileService';
import {Config} from '../constants/config';
import {DukaanColors, Palette, Radii, Space} from '../constants/theme';
import type {OtpRequest} from '../models/AuthUser';
import type {RootStackParamList} from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({navigation}: Props): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [request, setRequest] = useState<OtpRequest | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendOtp = async () => {
    setBusy(true);
    setError(null);
    try {
      const req = await authService.requestOtp(phone);
      setRequest(req);
      setStep('otp');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send OTP');
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    if (!request) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await authService.verifyOtp(request, code);
      // Mirror App's first-launch routing: Setup if no profile yet, else Main.
      const hasProfile = await ProfileService.hasProfile();
      navigation.reset({
        index: 0,
        routes: [{name: hasProfile ? 'Main' : 'Setup'}],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setBusy(false);
    }
  };

  const changeNumber = () => {
    setStep('phone');
    setCode('');
    setRequest(null);
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, {paddingTop: insets.top + Space.xxxl}]}>
      <View style={styles.logo}>
        <Icon name="store" size={40} color={DukaanColors.primary} strokeWidth={2} />
      </View>
      <AppText variant="display" center>
        Dukaan
      </AppText>

      {step === 'phone' ? (
        <>
          <AppText variant="body" color={DukaanColors.textMuted} center style={styles.sub}>
            Apna mobile number daalein — OTP se login karein.
          </AppText>
          <Field label="Mobile number" style={styles.block}>
            <Input
              value={phone}
              onChangeText={setPhone}
              placeholder="98765 43210"
              keyboardType="phone-pad"
              prefix="+91"
              autoFocus
              maxLength={14}
            />
          </Field>
          {error ? (
            <AppText variant="cap" color={DukaanColors.danger} style={styles.error}>
              {error}
            </AppText>
          ) : null}
          <Button
            title="Send OTP"
            size="lg"
            block
            loading={busy}
            onPress={sendOtp}
            style={styles.action}
          />
        </>
      ) : (
        <>
          <AppText variant="body" color={DukaanColors.textMuted} center style={styles.sub}>
            {request?.phoneE164} par bheja gaya {Config.auth.otpLength}-digit code
            daalein.
          </AppText>
          <Field label="OTP" style={styles.block}>
            <Input
              value={code}
              onChangeText={setCode}
              placeholder={'0'.repeat(Config.auth.otpLength)}
              keyboardType="number-pad"
              autoFocus
              maxLength={Config.auth.otpLength}
            />
          </Field>
          {error ? (
            <AppText variant="cap" color={DukaanColors.danger} style={styles.error}>
              {error}
            </AppText>
          ) : null}
          <Button
            title="Verify & continue"
            size="lg"
            block
            loading={busy}
            onPress={verify}
            style={styles.action}
          />
          <Pressable hitSlop={8} onPress={changeNumber} style={styles.change}>
            <AppText variant="label" color={DukaanColors.primary}>
              Change number
            </AppText>
          </Pressable>
        </>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: DukaanColors.bg, padding: Space.xl},
  logo: {
    width: 88,
    height: 88,
    borderRadius: Radii.xl,
    backgroundColor: Palette.orange[50],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Space.md,
  },
  sub: {marginTop: Space.sm, marginBottom: Space.xl},
  block: {marginBottom: Space.md},
  error: {marginTop: -Space.xs, marginBottom: Space.sm},
  action: {marginTop: Space.sm},
  change: {alignSelf: 'center', marginTop: Space.lg, padding: Space.sm},
});
