package com.railway.mapper;

import com.railway.entity.LineStation;
import org.apache.ibatis.annotations.*;
import java.util.List;
import java.util.Map;

@Mapper
public interface LineStationMapper {
    
    @Select("SELECT * FROM line_stations ORDER BY line_id, line_station_id")
    List<LineStation> findAll();
    
    @Select("SELECT * FROM line_stations WHERE id = #{id}")
    LineStation findById(Integer id);
    
    @Select("SELECT * FROM line_stations WHERE line_id = #{lineId} ORDER BY line_station_id")
    List<LineStation> findByLineId(Integer lineId);
    
    @Insert("INSERT IGNORE INTO line_stations(line_id, station_id, line_station_id, prev_station_id, " +
            "next_station_id, distance, total_distance, line_code, is_stop) " +
            "VALUES(#{lineId}, #{stationId}, #{lineStationId}, #{prevStationId}, #{nextStationId}, " +
            "#{distance}, #{totalDistance}, #{lineCode}, #{isStop})")
    int insert(LineStation lineStation);
    
    @Update("UPDATE line_stations SET line_id=#{lineId}, station_id=#{stationId}, " +
            "line_station_id=#{lineStationId}, prev_station_id=#{prevStationId}, " +
            "next_station_id=#{nextStationId}, distance=#{distance}, total_distance=#{totalDistance}, " +
            "line_code=#{lineCode}, is_stop=#{isStop} WHERE id=#{id}")
    int update(LineStation lineStation);
    
    @Delete("DELETE FROM line_stations WHERE id = #{id}")
    int delete(Integer id);
    
    @Delete("DELETE FROM line_stations")
    int deleteAll();
    
    @Select("SELECT COUNT(*) FROM line_stations")
    int count();
    
    @Select("SELECT DISTINCT line_id, line_code, COUNT(*) as station_count, MAX(total_distance) as distance " +
            "FROM line_stations GROUP BY line_id, line_code")
    List<Map<String, Object>> getLinesSummary();
    
    /**
     * 获取站点角色信息
     * 根据线路站点表判断：
     * - 如果 station_id = prev_station_id，说明是起始站（没有前一站）
     * - 如果 station_id = next_station_id，说明是终点站（没有后一站）
     */
    @Select("SELECT station_id, " +
            "SUM(CASE WHEN station_id = prev_station_id OR prev_station_id IS NULL OR prev_station_id = 0 THEN 1 ELSE 0 END) as is_start, " +
            "SUM(CASE WHEN station_id = next_station_id OR next_station_id IS NULL OR next_station_id = 0 THEN 1 ELSE 0 END) as is_end, " +
            "COUNT(DISTINCT line_id) as line_count " +
            "FROM line_stations " +
            "GROUP BY station_id")
    List<Map<String, Object>> getStationRolesByLinePosition();
    
    /**
     * 获取指定站点在各线路中的位置信息
     */
    @Select("SELECT ls.*, s.station_name " +
            "FROM line_stations ls " +
            "LEFT JOIN stations s ON ls.station_id = s.id " +
            "WHERE ls.station_id = #{stationId}")
    List<Map<String, Object>> getStationLineInfo(Integer stationId);
}
