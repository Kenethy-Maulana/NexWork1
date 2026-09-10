// components/ui/Calendar.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../styles/theme';

interface CalendarProps {
  selectedDate: string;
  onDateSelect: (date: string) => void;
  minDate?: string;
}

export const Calendar: React.FC<CalendarProps> = ({ selectedDate, onDateSelect, minDate }) => {
  // 1. Hook de Tema Dinâmico
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  
  const formatDate = (year: number, month: number, day: number) => 
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const isDateBefore = (date1: string, date2: string) => new Date(date1) < new Date(date2);

  const handlePrevMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentMonth(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentMonth);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentMonth(newDate);
  };

  const handleDatePress = (day: number) => {
    const dateStr = formatDate(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    if (minDate && isDateBefore(dateStr, minDate)) return;
    onDateSelect(dateStr);
  };

  const renderCalendar = () => {
    const days = [];
    const totalDays = daysInMonth(currentMonth);
    const firstDay = firstDayOfMonth(currentMonth);
    const todayStr = new Date().toISOString().split('T')[0];

    for (let i = 0; i < firstDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }

    for (let day = 1; day <= totalDays; day++) {
      const dateStr = formatDate(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      const isSelected = dateStr === selectedDate;
      const isDisabled = minDate ? isDateBefore(dateStr, minDate) : false;
      const isToday = dateStr === todayStr;

      days.push(
        <TouchableOpacity
          key={day}
          activeOpacity={0.7}
          style={[
            styles.dayCell,
            { borderRadius: borderRadius.full }, // Círculo perfeito
            isSelected && { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
            isToday && !isSelected && { backgroundColor: colors.surfaceLight },
            isDisabled && { opacity: 0.3 },
          ]}
          onPress={() => !isDisabled && handleDatePress(day)}
          disabled={isDisabled}
        >
          <Text style={[
            styles.dayText,
            { color: colors.text.primary, fontSize: fontSize.sm },
            isSelected && { color: '#FFFFFF', fontWeight: '700' }, // Sempre branco no selecionado para contraste
            isToday && !isSelected && { color: colors.primary, fontWeight: '700' },
            isDisabled && { color: colors.text.light },
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }
    return days;
  };

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.border }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton} activeOpacity={0.6}>
          <Ionicons name="chevron-back" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={[styles.monthText, { color: colors.text.primary, fontSize: fontSize.lg }]}>
          {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </Text>
        <TouchableOpacity onPress={handleNextMonth} style={styles.navButton} activeOpacity={0.6}>
          <Ionicons name="chevron-forward" size={24} color={colors.text.primary} />
        </TouchableOpacity>
      </View>

      {/* Dias da Semana */}
      <View style={styles.weekDays}>
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day) => (
          <Text key={day} style={[styles.weekDayText, { color: colors.text.secondary, fontSize: fontSize.xs }]}>
            {day}
          </Text>
        ))}
      </View>

      {/* Grid de Dias */}
      <View style={styles.daysGrid}>
        {renderCalendar()}
      </View>
    </View>
  );
};

// Apenas estilos estruturais (layout) que não mudam com o tema
const styles = StyleSheet.create({
  container: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    borderRadius: 20,
  },
  monthText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayText: {
    fontWeight: '500',
  },
});