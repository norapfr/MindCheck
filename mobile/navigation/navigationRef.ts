import { createNavigationContainerRef, CommonActions } from '@react-navigation/native';
import type { RootStackParamList } from '../App';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

export function resetToOnboardingWithSessionExpired() {
    if (navigationRef.isReady()) {
        navigationRef.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Login', params: { sessionExpired: true } }],
            })
        );
    }
}