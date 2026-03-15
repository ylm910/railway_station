package com.railway.mapper;

import com.railway.entity.Train;
import org.apache.ibatis.annotations.*;
import java.util.List;
import java.util.Map;

@Mapper
public interface TrainMapper {
    
    @Select("SELECT * FROM trains")
    List<Train> findAll();
    
    @Select("SELECT * FROM trains WHERE id = #{id}")
    Train findById(Integer id);
    
    @Select("SELECT * FROM trains WHERE train_code = #{code}")
    Train findByCode(String code);
    
    @Insert("INSERT IGNORE INTO trains(id, train_code, train_type, capacity, status) " +
            "VALUES(#{id}, #{trainCode}, #{trainType}, #{capacity}, #{status})")
    int insert(Train train);
    
    @Update("UPDATE trains SET train_code=#{trainCode}, train_type=#{trainType}, " +
            "capacity=#{capacity}, status=#{status} WHERE id=#{id}")
    int update(Train train);
    
    @Delete("DELETE FROM trains WHERE id = #{id}")
    int delete(Integer id);
    
    @Delete("DELETE FROM trains")
    int deleteAll();
    
    // 统计列车类型分布 - 基于train_type字段，关联typeName
    @Select("SELECT train_type as trainType, COUNT(*) as count, SUM(capacity) as totalCapacity " +
            "FROM trains GROUP BY train_type ORDER BY count DESC")
    List<Map<String, Object>> countByType();
    
    // 按typeName统计（如果有这个字段）
    @Select("SELECT train_type as trainType, COUNT(*) as count " +
            "FROM trains WHERE train_type IS NOT NULL " +
            "GROUP BY train_type ORDER BY count DESC")
    List<Map<String, Object>> countByTrainType();
    
    // 统计总数
    @Select("SELECT COUNT(*) FROM trains")
    int count();
    
    // 平均运量
    @Select("SELECT AVG(capacity) FROM trains WHERE capacity IS NOT NULL AND capacity > 0")
    Double avgCapacity();
    
    // 批量插入
    int batchInsert(List<Train> trains);
}
