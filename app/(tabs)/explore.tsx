import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { FlatList, Modal, RefreshControl, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../_ThemeContext';

type Score = {
  username: string;
  status: string;
  guesses_taken: number;
  words_guessed?: string[];
  evaluations?: string[][];
  time_taken?: number; // Add this!
};

export default function ExploreScreen() {

  // --- THEME VARIABLES ---
  const { isDark } = useTheme();
  const themeBg = isDark ? '#121212' : '#ffffff';
  const textColor = isDark ? '#ffffff' : '#121212';
  const cardBg = isDark ? '#1e1e1e' : '#f4f4f5';
  const borderColor = isDark ? '#333333' : '#f0f2f5';
  const modalBg = isDark ? '#1e1e1e' : '#ffffff';
  const emptyBoxBorder = isDark ? '#3a3a3c' : '#d3d6da';
  // -----------------------

  // Add this formatter right at the top of the component
  const formatTime = (seconds?: number) => {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };
  const getLocalDateString = (d: Date) => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const todayStr = getLocalDateString(new Date());

  const [scores, setScores] = useState<Score[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedScore, setSelectedScore] = useState<Score | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr); // Tracks the currently viewed date

  // Re-fetch automatically whenever the date changes
  useEffect(() => {
    fetchScores();
  }, [selectedDate]);

 const fetchScores = async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/leaderboard?date=${selectedDate}`);
      const data = await res.json();
      setScores(data);
    } catch (error) {
      console.error(error);
    } finally {
      setRefreshing(false);
    }
  };

  // Date Navigation Logic
  const shiftDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(getLocalDateString(d));
  };

  // Formats the date to look nice in the UI (e.g., "Today", "Yesterday", "Oct 24")
  const getDisplayDate = () => {
    if (selectedDate === todayStr) return 'Today';
    
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (selectedDate === getLocalDateString(yesterday)) return 'Yesterday';
    
    return new Date(selectedDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeBg }]}>
      
      {/* Interactive Date Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerTitle, { color: textColor }]}>Leaderboard</Text>
        
        <View style={[styles.dateSelector, { backgroundColor: cardBg }]}>
          <TouchableOpacity onPress={() => shiftDate(-1)} style={styles.dateArrow} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={16} color={textColor} />
          </TouchableOpacity>
          
          <View style={[styles.datePill, { backgroundColor: isDark ? '#333' : '#ffffff' }]}>
            <Text style={[styles.dateText, { color: textColor }]}>{getDisplayDate()}</Text>
          </View>
          
          <TouchableOpacity 
            onPress={() => shiftDate(1)} 
            style={[styles.dateArrow, selectedDate === todayStr && styles.dateArrowDisabled]} 
            disabled={selectedDate === todayStr} 
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-forward" size={16} color={selectedDate === todayStr ? (isDark ? "#555" : "#d3d6da") : textColor} />
          </TouchableOpacity>
        </View>
      </View>
      
      <FlatList
        data={scores}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchScores} tintColor={textColor} />}
        keyExtractor={(item, index) => item.username + index}
        renderItem={({ item, index }) => (
          <TouchableOpacity 
            style={[styles.row, { borderColor: borderColor }]}
            activeOpacity={0.7}
            onPress={() => setSelectedScore(item)}
          >
            <View style={[styles.rankBadge, index === 0 ? styles.rankBadgeGold : { backgroundColor: cardBg }]}>
              <Text style={[styles.rankText, index === 0 ? styles.rankTextGold : { color: isDark ? '#888' : '#888' }]}>
                {index + 1}
              </Text>
            </View>
            <Text style={[styles.name, { color: textColor }]}>{item.username}</Text>
            
            <View style={[styles.scorePill, item.status === 'WIN' ? [styles.scorePillWin, isDark && { backgroundColor: '#1b3320' }] : [styles.scorePillFail, isDark && { backgroundColor: '#3b1c1c' }]]}>
              <Text style={[styles.scoreText, item.status !== 'WIN' && styles.scoreTextFail]}>
                {item.status === 'WIN' ? `${item.guesses_taken}/6` : 'FAIL'}
              </Text>
            </View>
            
            <Ionicons name="chevron-forward" size={20} color={isDark ? "#555" : "#c7c7cc"} style={{ marginLeft: 12 }} />
            
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={[styles.empty, { color: isDark ? '#666' : '#a1a1aa' }]}>No scores yet today. Be the first!</Text>}
      />
      
      {/* The Wordle Board Modal */}
      <Modal visible={!!selectedScore} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: modalBg }]}>
            <Text style={[styles.modalTitle, { color: textColor }]}>{selectedScore?.username}'s Board</Text>
            
            <View style={styles.gridContainer}>
              {[...Array(6)].map((_, rowIndex) => {
                // 1. SAFE PARSE for words_guessed (just like we did for evaluations)
                let wordsArray = selectedScore?.words_guessed || [];
                if (typeof wordsArray === 'string') {
                  try { wordsArray = JSON.parse(wordsArray); } catch(e) {}
                }
                const word = wordsArray[rowIndex] || ''; 
                
                return (
                  <View key={rowIndex} style={styles.gridRow}>
                    {[...Array(5)].map((_, colIndex) => {
                      const letter = word[colIndex] || '';
                      const isFilled = letter !== '';
                      
                      // 2. SAFE PARSE for evaluations
                      let evalsArray = selectedScore?.evaluations || [];
                      if (typeof evalsArray === 'string') {
                        try { evalsArray = JSON.parse(evalsArray); } catch(e) {}
                      }
                      
                      const evaluation = evalsArray?.[rowIndex]?.[colIndex] || 'empty';
                      
                      const boxStyles: any[] = [styles.gridBox, { backgroundColor: modalBg, borderColor: emptyBoxBorder }];
                      const textStyles: any[] = [styles.gridLetter, { color: textColor }];
                      
                      if (evaluation === 'correct') {
                        boxStyles.push(styles.gridBoxCorrect);
                        textStyles.push(styles.gridLetterWhite);
                      } else if (evaluation === 'present') {
                        boxStyles.push(styles.gridBoxPresent);
                        textStyles.push(styles.gridLetterWhite);
                      } else if (evaluation === 'absent') {
                        // 3. TRUE DARK MODE ABSENT COLOR
                        boxStyles.push([styles.gridBoxAbsent, isDark && { backgroundColor: '#3a3a3c', borderColor: '#3a3a3c' }]);
                        textStyles.push(styles.gridLetterWhite);
                      } else if (isFilled) {
                        boxStyles.push([styles.gridBoxFilled, isDark && { borderColor: '#565758' }]);
                      }
                      
                      return (
                        <View key={colIndex} style={boxStyles}>
                          <Text style={textStyles}>{letter.toUpperCase()}</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })}
            </View>

            <TouchableOpacity style={[styles.closeButton, { backgroundColor: isDark ? '#333' : '#121212' }]} onPress={() => setSelectedScore(null)}>
              <Text style={styles.closeButtonText}>Close Board</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff', paddingHorizontal: 20 },
  
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, marginTop: 40 },
  headerTitle: { fontSize: 32, fontWeight: '900', letterSpacing: -1.5, color: '#121212' },
  
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f4f4f5', borderRadius: 16, paddingHorizontal: 2, paddingVertical: 2 },
  dateArrow: { padding: 6 },
  dateArrowDisabled: { opacity: 0.5 },
  datePill: { backgroundColor: '#ffffff', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1, marginHorizontal: 2 },
  dateText: { fontSize: 13, fontWeight: '700', color: '#121212', minWidth: 54, textAlign: 'center' },
  row: { flexDirection: 'row', paddingVertical: 16, borderBottomWidth: 1, borderColor: '#f0f2f5', alignItems: 'center' },
  
  rankBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#f4f4f5', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  rankBadgeGold: { backgroundColor: '#c9b458' }, // Wordle Yellow for 1st Place
  rankText: { fontSize: 16, fontWeight: 'bold', color: '#888' },
  rankTextGold: { color: '#fff' },
  
  name: { fontSize: 18, flex: 1, fontWeight: '600', color: '#121212' },
  
  scorePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  scorePillWin: { backgroundColor: '#e8f5e9' },
  scorePillFail: { backgroundColor: '#ffeeee' },
  scoreText: { fontSize: 16, fontWeight: 'bold', color: '#6aaa64' },
  scoreTextFail: { color: '#e57373' }, 
    
  empty: { textAlign: 'center', color: '#a1a1aa', marginTop: 40, fontSize: 16, fontWeight: '500' },
  // Modal & Grid Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#121212',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  gridContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 6, // Space between rows
    marginBottom: 24,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6, // Space between boxes
  },
  gridBox: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: '#d3d6da', // Standard Wordle empty box border
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },

  gridLetter: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#121212',
  },
  closeButton: {
    backgroundColor: '#121212',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gridBoxFilled: { borderColor: '#878a8c' },
  gridBoxCorrect: { backgroundColor: '#6aaa64', borderColor: '#6aaa64' },
  gridBoxPresent: { backgroundColor: '#c9b458', borderColor: '#c9b458' },
  gridBoxAbsent: { backgroundColor: '#787c7e', borderColor: '#787c7e' },
  gridLetterWhite: { color: '#ffffff' },
});