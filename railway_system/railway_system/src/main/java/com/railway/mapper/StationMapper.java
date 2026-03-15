package com.railway.mapper;

import com.railway.entity.Station;
import org.apache.ibatis.annotations.*;
import java.util.List;
import java.util.Map;

@Mapper
public interface StationMapper {
    
    @Select("SELECT * FROM stations")
    List<Station> findAll();
    
    @Select("SELECT * FROM stations WHERE id = #{id}")
    Station findById(Integer id);
    
    @Select("SELECT * FROM stations WHERE station_name LIKE CONCAT('%', #{name}, '%')")
    List<Station> findByName(String name);
    
    @Insert("INSERT IGNORE INTO stations(id, station_name, station_code, station_type, platforms, remark) " +
            "VALUES(#{id}, #{stationName}, #{stationCode}, #{stationType}, #{platforms}, #{remark})")
    int insert(Station station);
    
    @Update("UPDATE stations SET station_name=#{stationName}, station_code=#{stationCode}, " +
            "station_type=#{stationType}, platforms=#{platforms}, remark=#{remark} WHERE id=#{id}")
    int update(Station station);
    
    @Delete("DELETE FROM stations WHERE id = #{id}")
    int delete(Integer id);
    
    @Delete("DELETE FROM stations")
    int deleteAll();
    
    @Select("SELECT COUNT(*) FROM stations")
    int count();
    
    // 按类型统计
    @Select("SELECT station_type as type, COUNT(*) as count FROM stations GROUP BY station_type")
    List<Map<String, Object>> countByType();
    
    // 批量插入
    int batchInsert(List<Station> stations);
}
