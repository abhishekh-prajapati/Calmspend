import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  BackHandler,
  Platform,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import { APP_CONFIG } from './config';

export default function App() {
  const [currentUrl, setCurrentUrl] = useState(APP_CONFIG.DEFAULT_URL);
  const [inputUrl, setInputUrl] = useState(APP_CONFIG.DEFAULT_URL);
  const [showUrlBar, setShowUrlBar] = useState(false);
  const [_isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  const webViewRef = useRef(null);

  // Handle Android hardware back button
  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true; // prevent app exit
      }
      return false; // let app exit
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [canGoBack]);

  const handleApplyUrl = () => {
    let clean = inputUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'https://' + clean;
    }
    setCurrentUrl(clean);
    setInputUrl(clean);
    setShowUrlBar(false);
    setHasError(false);
  };

  const handleReload = () => {
    setHasError(false);
    if (webViewRef.current) {
      webViewRef.current.reload();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ExpoStatusBar style="light" backgroundColor="#090d16" />

      {/* Top Controls (toggleable or shown on error) */}
      {(showUrlBar || hasError) && (
        <View style={styles.urlBarContainer}>
          <TextInput
            style={styles.urlInput}
            value={inputUrl}
            onChangeText={setInputUrl}
            placeholder="Enter App URL (e.g. https://...loca.lt)"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TouchableOpacity style={styles.connectButton} onPress={handleApplyUrl}>
            <Text style={styles.connectButtonText}>Connect</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main WebView Area */}
      <View style={styles.webviewContainer}>
        <WebView
          ref={webViewRef}
          source={{ uri: currentUrl }}
          style={styles.webview}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          allowsBackForwardNavigationGestures={true}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
          }}
          onLoadStart={() => {
            setIsLoading(true);
            setHasError(false);
          }}
          onLoadEnd={() => {
            setIsLoading(false);
          }}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#3b82f6" />
              <Text style={styles.loadingText}>Loading PBP Finance...</Text>
            </View>
          )}
          renderError={() => (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Unable to Connect</Text>
              <Text style={styles.errorMessage}>
                Could not reach: {currentUrl}
              </Text>
              <Text style={styles.errorHint}>
                If testing over different Wi-Fi networks:
                {'\n'}1. Start tunnel on your PC:
                {'\n'}   npx localtunnel --port 5173
                {'\n'}2. Enter the generated https URL above and tap Connect.
              </Text>
              <View style={styles.errorActions}>
                <TouchableOpacity style={styles.retryButton} onPress={handleReload}>
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.changeUrlButton}
                  onPress={() => setShowUrlBar(!showUrlBar)}
                >
                  <Text style={styles.changeUrlButtonText}>
                    {showUrlBar ? 'Hide URL Bar' : 'Change URL'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      </View>

      {/* Subtle bottom settings trigger */}
      {!hasError && !showUrlBar && (
        <TouchableOpacity
          style={styles.floatingSettingsTrigger}
          onPress={() => setShowUrlBar(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.settingsIcon}>⚙️ Change Server URL</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  urlBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#111827',
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    gap: 8,
  },
  urlInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#1f2937',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: '#ffffff',
    fontSize: 14,
  },
  connectButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 14,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  webviewContainer: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  webview: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#94a3b8',
    fontSize: 15,
  },
  errorContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#090d16',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ef4444',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorHint: {
    fontSize: 13,
    color: '#cbd5e1',
    backgroundColor: '#1e293b',
    padding: 14,
    borderRadius: 8,
    lineHeight: 20,
    marginBottom: 20,
    width: '100%',
  },
  errorActions: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  changeUrlButton: {
    backgroundColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  changeUrlButtonText: {
    color: '#f8fafc',
    fontWeight: '600',
  },
  floatingSettingsTrigger: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(30, 41, 59, 0.85)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  settingsIcon: {
    color: '#94a3b8',
    fontSize: 11,
  },
});
