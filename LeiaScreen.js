import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Permissions from 'expo-permissions';
import { Audio } from 'expo-av';
import axios from 'axios';

// 🔗 Ton lien ngrok ici :
const API_URL = "https://unimaginable-stephen-nomodectrinaire.ngrok-free.dev";

export default function LeiaScreen() {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    requestMicroPermission();
  }, []);

  const requestMicroPermission = async () => {
    const { status } = await Permissions.askAsync(Permissions.AUDIO_RECORDING);
    if (status !== 'granted') {
      Alert.alert("Permission refusée", "Le micro est nécessaire pour parler avec Leia.");
    }
  };

  const startRecording = async () => {
    try {
      console.log("🎙️ Démarrage de l'enregistrement...");
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await recording.startAsync();
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error("Erreur lors du démarrage :", err);
    }
  };

  const stopRecording = async () => {
    console.log("🛑 Arrêt de l'enregistrement...");
    setIsRecording(false);
    if (!recording) return;

    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    console.log("✅ Fichier audio enregistré :", uri);
    setRecording(null);

    if (uri) await sendAudioToLeia(uri);
  };

  const sendAudioToLeia = async (uri) => {
    try {
      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'voice.m4a',
      });

      console.log("📤 Envoi du fichier audio à Leia...");
      const response = await axios.post(`${API_URL}/api/transcribe`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log("🧠 Réponse du serveur Leia :", response.data);
      if (response.data.text) {
        setResponseText(response.data.text);
        await getLeiaResponse(response.data.text);
      } else {
        Alert.alert("Erreur", "Leia n'a pas compris ton message.");
      }
    } catch (err) {
      console.error("Erreur d'envoi audio :", err);
      Alert.alert("Erreur", "Connexion au serveur Leia impossible.");
    }
  };

  const getLeiaResponse = async (text) => {
    try {
      console.log("💬 Envoi du texte à Leia :", text);
      const res = await axios.post(`${API_URL}/api/ask`, { text });
      console.log("🎧 Réponse complète :", res.data);

      if (res.data.reply) {
        setResponseText(res.data.reply);
      }

      if (res.data.audioUrl) {
        console.log("🔊 Lecture de la réponse audio...");
        const { sound } = await Audio.Sound.createAsync({ uri: res.data.audioUrl });
        await sound.playAsync();
      }
    } catch (error) {
      console.error("Erreur dans getLeiaResponse :", error);
      Alert.alert("Erreur", "Problème lors de la réponse vocale de Leia.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎙️ Parle avec Leia</Text>

      <TouchableOpacity
        style={[styles.button, isRecording && styles.buttonActive]}
        onPress={isRecording ? stopRecording : startRecording}
      >
        <Text style={styles.buttonText}>{isRecording ? '⏹️ Stop' : '🎤 Parler'}</Text>
      </TouchableOpacity>

      <Text style={styles.response}>{responseText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#031948',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#0847BF',
    paddingVertical: 20,
    paddingHorizontal: 60,
    borderRadius: 50,
  },
  buttonActive: {
    backgroundColor: '#BF0847',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
  },
  response: {
    color: '#fff',
    marginTop: 30,
    fontSize: 16,
    textAlign: 'center',
  },
});
